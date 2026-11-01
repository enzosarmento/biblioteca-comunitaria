#!/usr/bin/env python3
"""Valida o documento técnico do projeto contra o código real.

Uso:
    python check_docs.py <docs/DOCUMENTACAO.md> [--project <raiz>] [--min-words 3500]

Verifica: seções obrigatórias, tamanho, marcadores de rascunho, diagramas Mermaid, blocos de código
balanceados, imagens/links locais existentes, JWT real vazado, IDs de requisitos na matriz de
rastreabilidade e, se --project for informado, se controllers/rotas Angular/entidades do código
aparecem no texto (para impedir documentação que descreve algo que não existe, ou omite algo que existe).

Saída com código 1 se houver erro. Avisos não reprovam, mas devem ser revisados.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REQUIRED_SECTIONS = [
    (r"resumo", "Resumo"),
    (r"problema", "Problema"),
    (r"p[úu]blico", "Público-alvo"),
    (r"funcionalidades", "Funcionalidades"),
    (r"requisitos", "Requisitos"),
    (r"arquitetura", "Arquitetura"),
    (r"modelo de dados|modelagem", "Modelo de dados"),
    (r"api rest|backend", "Backend/API REST"),
    (r"seguran[çc]a|autentica[çc][ãa]o", "Segurança e autenticação"),
    (r"frontend", "Frontend"),
    (r"como executar|execu[çc][ãa]o|instala[çc][ãa]o", "Como executar"),
    (r"testes|valida[çc][ãa]o", "Testes e validação"),
    (r"decis[õo]es", "Decisões técnicas"),
    (r"limita[çc][õo]es|melhorias|trabalhos futuros", "Limitações e melhorias"),
    (r"gloss[áa]rio", "Glossário"),
    (r"rastreabilidade", "Rastreabilidade"),
]

REQ_IDS = (
    [f"R-GE-{i:02d}" for i in range(1, 5)]
    + [f"R-FE-{i:02d}" for i in range(1, 12)]
    + [f"R-BE-{i:02d}" for i in range(1, 17)]
    + [f"R-DO-{i:02d}" for i in range(1, 6)]
)

PLACEHOLDERS = [
    r"\bTODO\b", r"\bTBD\b", r"\bFIXME\b", r"\bXXX\b", r"lorem ipsum", r"\[preencher", r"\[inserir",
    r"<inserir", r"\ba definir\b", r"\bem breve\b", r"\[nome do", r"\[descri[çc][ãa]o", r"\bcoming soon\b",
]

SKIP_DIRS = {"node_modules", "build", ".gradle", ".angular", "dist", ".git", "target"}


def walk(root: Path, suffix: str):
    for p in root.rglob(f"*{suffix}"):
        if p.is_file() and not (set(p.parts) & SKIP_DIRS):
            yield p


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    doc_path = Path(argv[1])
    project = Path(argv[argv.index("--project") + 1]) if "--project" in argv else None
    min_words = int(argv[argv.index("--min-words") + 1]) if "--min-words" in argv else 3500
    if not doc_path.exists():
        print(f"ERRO: {doc_path} não existe")
        return 1

    text = doc_path.read_text(encoding="utf-8")
    low = text.lower()
    errors: list[str] = []
    warns: list[str] = []

    # 1. seções (considera só linhas de título)
    headings = [h.lower() for h in re.findall(r"(?m)^#{1,4}\s+(.+)$", text)]
    for pattern, label in REQUIRED_SECTIONS:
        if not any(re.search(pattern, h) for h in headings):
            errors.append(f"Seção obrigatória ausente: {label}")

    # 2. tamanho
    words = len(re.findall(r"\w+", re.sub(r"```.*?```", "", text, flags=re.S)))
    if words < min_words:
        errors.append(f"Documento curto: {words} palavras (mínimo {min_words}, sem contar blocos de código)")

    # 3. rascunho
    for pat in PLACEHOLDERS:
        for m in re.finditer(pat, text, flags=re.I):
            line = text.count("\n", 0, m.start()) + 1
            errors.append(f"Marcador de rascunho '{m.group(0)}' na linha {line}")

    # 4. mermaid e blocos
    fences = len(re.findall(r"(?m)^```", text))
    if fences % 2:
        errors.append("Blocos de código não balanceados (número ímpar de ```)")
    n_mermaid = len(re.findall(r"(?m)^```mermaid", text))
    if n_mermaid < 3:
        errors.append(f"Esperados >= 3 diagramas Mermaid (arquitetura, ER, sequência do login); encontrados {n_mermaid}")

    # 5. imagens e links locais
    for target in re.findall(r"!?\[[^\]]*\]\(([^)\s]+)\)", text):
        if re.match(r"^(https?:|mailto:|#)", target):
            continue
        if not (doc_path.parent / target.split("#")[0]).exists():
            errors.append(f"Link/imagem local inexistente: {target}")

    # 6. JWT real vazado / segredos
    if re.search(r"eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}", text):
        errors.append("Há um JWT completo no texto: trunque ('eyJhbGciOi...') para não expor token válido")
    if re.search(r"(?i)(jwt[_-]?secret|password)\s*[:=]\s*['\"]?(?!admin123|app\b|\$\{|<|\*|senha|troque)[^\s'\"]{12,}", text):
        warns.append("Possível segredo/senha real no texto: confirme que são apenas valores de desenvolvimento")

    # 7. rastreabilidade
    missing = [r for r in REQ_IDS if r not in text]
    if missing:
        errors.append(f"IDs de requisito ausentes da matriz de rastreabilidade: {', '.join(missing)}")

    # 8. contraste com o código
    if project:
        controllers: set[str] = set()
        entities: set[str] = set()
        for kt in walk(project, ".kt"):
            if "src/test" in kt.as_posix():
                continue
            code = kt.read_text(encoding="utf-8", errors="replace")
            if "@RestController" in code:
                controllers.update(re.findall(r'@RequestMapping\(\s*(?:value\s*=\s*)?"(/[^"]+)"', code))
            for m in re.finditer(r"@Entity\b[\s\S]*?class\s+(\w+)", code):
                entities.add(m.group(1))
        for path in sorted(controllers):
            if path not in text:
                errors.append(f"Endpoint base {path} existe no código e não aparece na documentação")
        for ent in sorted(entities):
            if ent not in text:
                errors.append(f"Entidade {ent} existe no código e não aparece na documentação")

        routes: set[str] = set()
        for ts in walk(project, ".ts"):
            if ts.name.startswith("app.routes") and not ts.name.endswith(".spec.ts"):
                routes.update(re.findall(r"path\s*:\s*['\"]([^'\"*]+)['\"]", ts.read_text(encoding="utf-8", errors="replace")))
        for r in sorted(x for x in routes if x):
            if r not in text:
                warns.append(f"Rota Angular '{r}' existe no código e não aparece na documentação")

        # endpoints citados na doc que não existem no código
        documented = set(re.findall(r"`(?:GET|POST|PUT|PATCH|DELETE)\s+(/api/[A-Za-z0-9_\-/{}]+)`", text))
        if controllers and documented:
            bases = tuple(controllers)
            for d in sorted(documented):
                if not d.startswith(bases):
                    errors.append(f"Documentação cita {d}, mas nenhum controller tem essa base ({', '.join(sorted(controllers))})")

    print(f"Documento: {doc_path} | {words} palavras | {n_mermaid} diagramas Mermaid | {len(headings)} títulos")
    for w in warns:
        print(f"[AVISO] {w}")
    for e in errors:
        print(f"[ERRO ] {e}")
    if not errors:
        print("OK: documento aprovado nas verificações automáticas. Ainda faça a leitura final.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
