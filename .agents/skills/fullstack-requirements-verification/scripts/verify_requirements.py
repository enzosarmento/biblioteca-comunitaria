#!/usr/bin/env python3
"""Auditoria estática do projeto Angular + Spring Boot (Kotlin) contra o enunciado.

Uso:
    python verify_requirements.py <raiz-do-projeto> [--json]

Procura os diretórios `backend/` (build.gradle.kts ou pom.xml) e `frontend/` (angular.json)
a partir da raiz. Cada verificação retorna PASS, WARN ou FAIL e referencia o ID do requisito
(ver crud-jwt-fullstack-orchestrator/references/requisitos.md).

Limites: é heurístico (regex). Um PASS significa "há evidência no código", não "funciona".
Sempre complemente com testes automatizados e com o roteiro e2e. Saída com código 1 se houver FAIL.
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

SKIP_DIRS = {"node_modules", "build", ".gradle", ".angular", "dist", ".git", "target", ".idea"}


def walk(root: Path, suffixes: tuple[str, ...]) -> list[Path]:
    out: list[Path] = []
    if not root.exists():
        return out
    for p in root.rglob("*"):
        if p.is_file() and p.suffix in suffixes and not (set(p.parts) & SKIP_DIRS):
            out.append(p)
    return out


def strip_comments(code: str) -> str:
    code = re.sub(r"/\*.*?\*/", "", code, flags=re.S)
    return re.sub(r"(?m)^\s*//.*$|(?<=\s)//.*$", "", code)


def read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


@dataclass
class Result:
    id: str
    req: str
    status: str  # PASS | WARN | FAIL
    msg: str


@dataclass
class Ctx:
    results: list[Result] = field(default_factory=list)

    def add(self, id_: str, req: str, ok: bool | None, msg_ok: str, msg_bad: str, severity: str = "FAIL") -> None:
        if ok:
            self.results.append(Result(id_, req, "PASS", msg_ok))
        else:
            self.results.append(Result(id_, req, severity, msg_bad))


def find_dir(root: Path, markers: tuple[str, ...]) -> Path | None:
    for cand in [root, root / "backend", root / "frontend", *[d for d in root.iterdir() if d.is_dir()]] if root.exists() else []:
        if any((cand / m).exists() for m in markers):
            return cand
    return None


# ------------------------------------------------------------------ backend
def check_backend(ctx: Ctx, be: Path) -> None:
    kt = walk(be / "src" / "main", (".kt",))
    kt_text = {p: strip_comments(read(p)) for p in kt}
    all_kt = "\n".join(kt_text.values())
    yml_files = [p for p in walk(be / "src" / "main" / "resources", (".yml", ".yaml", ".properties"))]
    yml = "\n".join(read(p) for p in yml_files)
    build = read(be / "build.gradle.kts") + read(be / "build.gradle") + read(be / "pom.xml")

    ctx.add("B01", "R-GE-03", bool(kt) and "spring-boot" in build and "kotlin" in build.lower(),
            f"{len(kt)} arquivos Kotlin; Spring Boot + Kotlin no build",
            "Projeto não parece ser Spring Boot com Kotlin (build ou arquivos .kt ausentes)")

    entities = [p for p, t in kt_text.items() if "@Entity" in t]
    ctx.add("B02", "R-BE-08/09", len(entities) >= 2,
            f"{len(entities)} entidades JPA ({', '.join(p.stem for p in entities[:6])})",
            "Esperadas >= 2 entidades @Entity (usuário + entidade principal)")
    ctx.add("B03", "R-BE-08", "plugin.jpa" in build or "no-arg" in build or "jpa" in build.lower() and "noArg" in build,
            "Plugin kotlin-jpa/no-arg configurado", "Plugin kotlin(\"plugin.jpa\") ausente: JPA exigirá construtor sem argumentos", "WARN")
    ctx.add("B04", "R-BE-08", "plugin.spring" in build or "allopen" in build.lower(),
            "Plugin kotlin-spring/all-open configurado", "Plugin kotlin(\"plugin.spring\") ausente: proxies do Spring podem falhar", "WARN")

    data_class_entities = [p.name for p, t in kt_text.items() if "@Entity" in t and re.search(r"\bdata\s+class\b", t)]
    ctx.add("B05", "R-BE-08", not data_class_entities, "Nenhuma entidade é data class",
            f"Entidade como data class (evite, quebra Hibernate): {data_class_entities}")

    repos = [p for p, t in kt_text.items() if re.search(r"interface\s+\w+\s*:\s*(Jpa|Crud|PagingAndSorting)\w*Repository", t)]
    ctx.add("B06", "R-BE-03/08", len(repos) >= 2, f"{len(repos)} repositories Spring Data", "Esperados >= 2 repositories (JpaRepository)")

    controllers = [p for p, t in kt_text.items() if "@RestController" in t]
    services = [p for p, t in kt_text.items() if re.search(r"@Service\b", t)]
    ctx.add("B07", "R-BE-03", len(controllers) >= 2 and len(services) >= 2,
            f"{len(controllers)} controllers, {len(services)} services", "Esperados >= 2 controllers e >= 2 services")

    main_ctrl = [p for p in controllers if "auth" not in p.stem.lower()]
    mappings_ok = False
    if main_ctrl:
        t = "\n".join(kt_text[p] for p in main_ctrl)
        mappings_ok = all(re.search(m, t) for m in (r"@GetMapping\(\"/\{", r"@GetMapping\b", r"@PostMapping", r"@PutMapping", r"@DeleteMapping"))
    ctx.add("B08", "R-BE-01", mappings_ok, "Controller principal com GET (lista e por id), POST, PUT, DELETE",
            "Controller do domínio sem as 5 operações de CRUD (GET lista, GET /{id}, POST, PUT, DELETE)")

    dto_files = [p for p in kt if re.search(r"(Request|Response|Dto|DTO)\b", read(p)) and "class" in read(p)]
    ctx.add("B09", "R-BE-04", len(dto_files) >= 2, f"{len(dto_files)} arquivos com DTOs", "DTOs de entrada/saída não encontrados")

    leak = []
    for p in main_ctrl:
        t = kt_text[p]
        for e in entities:
            if re.search(rf"fun\s+\w+\([^)]*\)\s*:\s*[^=\n{{]*\b{re.escape(e.stem)}\b", t) or re.search(rf"@RequestBody\s+\w+\s*:\s*{re.escape(e.stem)}\b", t):
                leak.append(f"{p.name} expõe {e.stem}")
    ctx.add("B10", "R-BE-04", not leak, "Controllers não expõem entidades JPA", f"Entidade em assinatura de controller: {leak}")

    ctx.add("B11", "R-BE-05", bool(re.search(r"@field:(NotBlank|NotNull|Size|Min|Max|Email|Positive|DecimalMin|Pattern)", all_kt)) and "@Valid" in all_kt,
            "Bean Validation com @field: e @Valid", "Faltam anotações @field:... e/ou @Valid nos controllers")
    bad_validation = re.findall(r"^\s*@(?:NotBlank|NotNull|Size|Min|Max|Email|Positive)\b[^\n]*\n\s*val\s", all_kt, re.M)
    ctx.add("B12", "R-BE-05", not bad_validation, "Anotações de validação com use-site target",
            "Validação sem @field: em construtor de data class (pode não ser aplicada)", "WARN")

    advice = any("@RestControllerAdvice" in t or "@ControllerAdvice" in t for t in kt_text.values())
    handles = all(k in all_kt for k in ("MethodArgumentNotValidException", "ResourceNotFound", "NOT_FOUND")) or ("MethodArgumentNotValidException" in all_kt and "NotFound" in all_kt)
    ctx.add("B13", "R-BE-07", advice and handles, "@RestControllerAdvice trata validação e não encontrado",
            "Falta @RestControllerAdvice tratando MethodArgumentNotValidException e not found")

    codes = ("created(" in all_kt or "HttpStatus.CREATED" in all_kt) and ("NO_CONTENT" in all_kt or "noContent()" in all_kt)
    ctx.add("B14", "R-BE-06", codes, "Usa 201 (created) e 204 (no content)", "POST deve devolver 201 (+Location) e DELETE 204")

    ctx.add("B15", "R-BE-13", "BCryptPasswordEncoder(" in all_kt or "createDelegatingPasswordEncoder" in all_kt,
            "PasswordEncoder BCrypt configurado", "Sem BCrypt/PasswordEncoder: senhas precisam ser armazenadas com hash")
    plain = re.findall(r"passwordHash\s*=\s*(?:request|req|dto)\.\w*password", all_kt, re.I)
    ctx.add("B16", "R-BE-13", not plain, "Nenhuma senha em texto puro sendo gravada", f"Senha possivelmente gravada sem hash: {plain}")

    leak_pw = [p.name for p, t in kt_text.items() if re.search(r"class\s+\w*Response\b[^)]*\b(password|passwordHash)\b", t, re.S)]
    ctx.add("B17", "R-BE-14", not leak_pw, "DTOs de resposta não têm senha", f"Resposta com campo de senha: {leak_pw}")

    has_jwt = ("oauth2ResourceServer" in all_kt and "JwtDecoder" in all_kt) or ("OncePerRequestFilter" in all_kt and re.search(r"jjwt|Jwts\.", all_kt + build))
    ctx.add("B18", "R-BE-11/12", bool(has_jwt) and ("expiresAt" in all_kt or "expiration" in all_kt.lower()),
            "JWT implementado com expiração", "Não encontrei emissão/validação de JWT com expiração")

    sec = "SessionCreationPolicy.STATELESS" in all_kt and "anyRequest().authenticated()" in all_kt
    ctx.add("B19", "R-BE-12", sec, "Stateless + anyRequest().authenticated()", "Cadeia de segurança deve ser STATELESS e exigir autenticação por padrão")

    permit = re.findall(r"permitAll\(\)", all_kt)
    ctx.add("B20", "R-BE-12", 1 <= len(permit) <= 3, f"{len(permit)} uso(s) de permitAll", "permitAll em excesso ou ausente (só login, OPTIONS)", "WARN")

    ctx.add("B21", "R-BE-15", "AuthenticationEntryPoint" in all_kt and ("TOKEN_EXPIRED" in all_kt or "expired" in all_kt.lower()),
            "AuthenticationEntryPoint distingue token expirado", "Falta tratamento JSON de 401 (token inválido/expirado)")
    ctx.add("B22", "R-BE-15", "BadCredentialsException" in all_kt or "AuthenticationException" in all_kt,
            "Credenciais incorretas tratadas", "Falta tratar BadCredentialsException/AuthenticationException no login")
    ctx.add("B23", "R-BE-16", "CorsConfiguration" in all_kt or "@CrossOrigin" in all_kt, "CORS configurado", "CORS não configurado: o Angular será bloqueado")

    mem = re.search(r"jdbc:h2:mem", yml) is not None
    drop = re.search(r"ddl-auto\s*[:=]\s*(create|create-drop)\b", yml) is not None
    has_db = bool(re.search(r"jdbc:(postgresql|mysql|mariadb|h2:file)", yml))
    ctx.add("B24", "R-BE-10", has_db and not mem and not drop,
            "Banco persistente (não H2 em memória) e ddl-auto sem create", 
            "Persistência não garantida: use PostgreSQL/MySQL/H2 em arquivo e ddl-auto=update/validate/none")

    hard = re.findall(r"(?:secret|SECRET)\s*=\s*\"[^\"]{8,}\"", all_kt)
    ctx.add("B25", "R-BE-11", not hard, "Segredo JWT não está fixo no código Kotlin", f"Segredo fixo em código: {hard[:1]}")
    ctx.add("B26", "R-BE-11", re.search(r"secret:\s*\$\{JWT_SECRET", yml) is not None or "JWT_SECRET" in yml,
            "Segredo vem de variável de ambiente (JWT_SECRET)", "Segredo JWT deveria vir de variável de ambiente", "WARN")

    tests = walk(be / "src" / "test", (".kt",))
    ctx.add("B27", "R-BE-01", len(tests) >= 2, f"{len(tests)} arquivos de teste", f"Apenas {len(tests)} arquivo(s) de teste no backend (esperado >= 2: autenticação + domínio)", "WARN")
    ctx.add("B28", "R-BE-10", any("docker-compose" in f.name or f.name == "compose.yaml" for f in be.parent.iterdir()) or "h2:file" in yml,
            "docker-compose (ou H2 em arquivo) presente", "Sem docker-compose.yml: como o banco sobe?", "WARN")


# ----------------------------------------------------------------- frontend
def check_frontend(ctx: Ctx, fe: Path) -> None:
    src = fe / "src"
    ts = walk(src, (".ts",))
    html = walk(src, (".html",))
    txt = {p: read(p) for p in ts + html}
    all_ts = "\n".join(t for p, t in txt.items() if p.suffix == ".ts")
    all_html = "\n".join(t for p, t in txt.items() if p.suffix == ".html")
    everything = all_ts + "\n" + all_html

    routes_files = [p for p in ts if p.name.startswith("app.routes") and not p.name.endswith(".spec.ts")]
    routes = "\n".join(read(p) for p in routes_files)
    n_comp = len(re.findall(r"\b(component|loadComponent)\s*:", routes))
    ctx.add("F01", "R-FE-01", n_comp >= 5, f"{n_comp} rotas com componente (login + >= 4 páginas)",
            f"Rotas insuficientes: {n_comp} (esperado >= 5: login, lista, cadastro, detalhes, edição)")
    ctx.add("F02", "R-FE-03", "provideRouter" in all_ts or "RouterModule" in all_ts, "Angular Router configurado", "Router não configurado")
    ctx.add("F03", "R-FE-08", "canActivate" in routes and bool(re.search(r"CanActivateFn|CanActivate\b|canActivate", all_ts)),
            "Rotas protegidas com canActivate", "Nenhum canActivate nas rotas protegidas")
    ctx.add("F04", "R-FE-10", bool(re.search(r"HttpInterceptorFn|HttpInterceptor\b", all_ts)) and "Bearer" in all_ts and "Authorization" in all_ts,
            "Interceptor adiciona Authorization: Bearer", "Interceptor com Authorization: Bearer ausente")
    ctx.add("F05", "R-FE-04", "provideHttpClient" in all_ts or "HttpClientModule" in all_ts, "HttpClient configurado", "HttpClient não configurado")

    svc = [p for p in ts if p.name.endswith(".service.ts")]
    components = [p for p in ts if (p.name.endswith(".component.ts") or p.name in {"login.ts"}) and not p.name.endswith(".spec.ts")]
    bad = [p.name for p in components if "HttpClient" in read(p)]
    ctx.add("F06", "R-FE-04", len(svc) >= 2 and not bad, f"{len(svc)} serviços; componentes não usam HttpClient",
            f"Poucos serviços ({len(svc)}) ou componentes usando HttpClient direto: {bad}")

    login_post = any(
        ".post" in read(p) and "auth/login" in read(p) and not p.name.endswith((".spec.ts", "interceptor.ts"))
        for p in ts
    )
    fake = re.search(r"(username|usuario|user)\s*===?\s*['\"](admin|user|teste)['\"]|of\(\s*\{[^}]*token", all_ts, re.I)
    ctx.add("F07", "R-FE-02", bool(login_post) and not fake, "Login chama /auth/login no backend",
            "Login não chama o backend ou parece simulado (comparação fixa/of({token}))")

    ctx.add("F08", "R-FE-05", "Validators" in all_ts and ("mat-error" in everything or "hasError" in everything or "invalid-feedback" in everything or "controlErrorMessage" in everything),
            "Reactive Forms com Validators e mensagens", "Validação de formulário com mensagens de erro não encontrada")
    ctx.add("F09", "R-FE-06", bool(re.search(r"MatSnackBar|ToastrService|MessageService|toast", all_ts, re.I)), "Notificações de sucesso/erro", "Sem mecanismo de notificação (snackbar/toast)")
    ctx.add("F10", "R-FE-07", bool(re.search(r"MatDialog|window\.confirm|\bconfirm\(|ConfirmService|ConfirmationService", all_ts)),
            "Confirmação antes de excluir", "Sem confirmação de exclusão")

    delete_calls = [p.name for p in ts if re.search(r"\.delete\(", read(p)) and p.name.endswith(".component.ts") and not re.search(r"confirm|Confirm|dialog", read(p))]
    ctx.add("F11", "R-FE-07", not delete_calls, "Componentes que excluem passam por confirmação", f"Componente exclui sem confirmar: {delete_calls}")

    ctx.add("F12", "R-FE-09", bool(re.search(r"logout\s*\(", all_ts)) and bool(re.search(r"\(click\)\s*=\s*\"[^\"]*logout", all_html + all_ts)),
            "Botão Sair chama logout", "Sem botão 'Sair' ligado a logout()")
    ctx.add("F13", "R-FE-11", bool(re.search(r"status\s*===?\s*401", all_ts)), "401 tratado no frontend", "Sem tratamento de 401 (token expirado/inválido)")
    ctx.add("F14", "R-GE-04", not re.search(r"(?:const|readonly|=)\s+\w*(products|items|books|tasks|events|pets)\w*\s*(?::\s*\w+\[\])?\s*=\s*\[\s*\{", all_ts, re.I),
            "Sem lista de registros fixa no Angular", "Array fixo de registros no Angular: dados devem vir da API", "WARN")
    ctx.add("F15", "R-FE-04", "environment" in all_ts and "apiUrl" in all_ts, "URL da API em environment", "URL da API deveria vir de environment.apiUrl", "WARN")
    specs = [p for p in ts if p.name.endswith(".spec.ts")]
    ctx.add("F16", "R-FE-05", len(specs) >= 2, f"{len(specs)} arquivos de teste", "Sem testes automatizados do frontend", "WARN")
    ctx.add("F17", "R-FE-01", bool(re.search(r"path\s*:\s*['\"]login['\"]", routes)), "Rota /login presente", "Rota /login ausente")
    ctx.add("F18", "R-FE-08", "localStorage.getItem" in all_ts or "sessionStorage" in all_ts or "signal" in all_ts, "Sessão persistida/lida pelo AuthService", "Sessão não persistida", "WARN")


def check_docs(ctx: Ctx, root: Path) -> None:
    doc = root / "docs" / "DOCUMENTACAO.md"
    readme = root / "README.md"
    ctx.add("D01", "R-DO-01", doc.exists() and len(read(doc).split()) > 2500,
            f"docs/DOCUMENTACAO.md com {len(read(doc).split())} palavras" if doc.exists() else "",
            "docs/DOCUMENTACAO.md ausente ou curto (< 2500 palavras)")
    ctx.add("D02", "R-DO-04", readme.exists() and bool(re.search(r"docker compose|gradlew|ng serve|npm start", read(readme))),
            "README com instruções de execução", "README.md ausente ou sem instruções de execução", "WARN")


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    root = Path(argv[1]).resolve()
    as_json = "--json" in argv
    ctx = Ctx()

    be = find_dir(root, ("build.gradle.kts", "build.gradle", "pom.xml"))
    fe = find_dir(root, ("angular.json",))
    if be:
        check_backend(ctx, be)
    else:
        ctx.add("B00", "R-GE-03", False, "", "Backend (build.gradle.kts/pom.xml) não encontrado")
    if fe:
        check_frontend(ctx, fe)
    else:
        ctx.add("F00", "R-GE-03", False, "", "Frontend (angular.json) não encontrado")
    check_docs(ctx, root)

    if as_json:
        print(json.dumps([r.__dict__ for r in ctx.results], ensure_ascii=False, indent=2))
    else:
        icon = {"PASS": "[ OK ]", "WARN": "[WARN]", "FAIL": "[FAIL]"}
        for r in ctx.results:
            print(f"{icon[r.status]} {r.id:<4} {r.req:<11} {r.msg}")
        n = {s: sum(1 for r in ctx.results if r.status == s) for s in ("PASS", "WARN", "FAIL")}
        print(f"\nResumo: {n['PASS']} ok, {n['WARN']} avisos, {n['FAIL']} falhas")
        print("Lembrete: verificação estática. Rode também os testes e o roteiro e2e.")
    return 1 if any(r.status == "FAIL" for r in ctx.results) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
