# Roteiro ponta a ponta (curl)

Pré-requisitos: banco no ar (`docker compose up -d`), backend em `http://localhost:8080` (`./gradlew bootRun`), usuário semeado (`admin` / `admin123`). Ajuste `API`, o recurso (`products`) e o corpo ao tema. Guarde a saída: ela é evidência para o relatório e para a documentação.

```bash
API=http://localhost:8080/api
J='Content-Type: application/json'
```

## Autenticação

```bash
# 1. Login correto → 200, token, expiresIn; resposta NÃO contém senha
curl -s -i -X POST $API/auth/login -H "$J" -d '{"username":"admin","password":"admin123"}'
TOKEN=$(curl -s -X POST $API/auth/login -H "$J" -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# 2. Login errado → 401 code=INVALID_CREDENTIALS (mesma resposta para usuário inexistente)
curl -s -i -X POST $API/auth/login -H "$J" -d '{"username":"admin","password":"errada"}'
curl -s -i -X POST $API/auth/login -H "$J" -d '{"username":"naoexiste","password":"x"}'

# 3. Login com corpo vazio → 400 VALIDATION_ERROR com fieldErrors
curl -s -i -X POST $API/auth/login -H "$J" -d '{}'

# 4. Sem token → 401 UNAUTHENTICATED
curl -s -i $API/products

# 5. Token adulterado → 401 TOKEN_INVALID
curl -s -i $API/products -H "Authorization: Bearer ${TOKEN}x"

# 6. Token expirado → 401 TOKEN_EXPIRED
#    Suba o backend com JWT_EXPIRATION_SECONDS=5, faça login, aguarde 70 s (tolerância de 60 s do Nimbus) e chame:
curl -s -i $API/products -H "Authorization: Bearer $TOKEN"
```

Verifique no corpo de 401/400: JSON no formato `ApiError` (`timestamp`, `status`, `code`, `message`, `path`, `fieldErrors`).

## CRUD

```bash
AUTH="Authorization: Bearer $TOKEN"
BODY='{"name":"Arroz 5kg","sku":"E2E-001","category":"ALIMENTOS","quantity":10,"minQuantity":3,"unitPrice":25.50}'

# 7. Criar → 201 + Location + corpo com id
curl -s -i -X POST $API/products -H "$J" -H "$AUTH" -d "$BODY"
ID=<id retornado>

# 8. Listar e buscar por id → 200
curl -s $API/products -H "$AUTH"
curl -s -i $API/products/$ID -H "$AUTH"

# 9. Duplicado → 409 CONFLICT
curl -s -i -X POST $API/products -H "$J" -H "$AUTH" -d "$BODY"

# 10. Dados inválidos → 400 VALIDATION_ERROR com erro por campo
curl -s -i -X POST $API/products -H "$J" -H "$AUTH" -d '{"name":"ab","sku":"","quantity":-1}'
# JSON malformado → 400 MALFORMED_REQUEST
curl -s -i -X POST $API/products -H "$J" -H "$AUTH" -d '{nome:'

# 11. Atualizar → 200 com dados novos; id inexistente → 404 NOT_FOUND
curl -s -i -X PUT $API/products/$ID -H "$J" -H "$AUTH" -d '{"name":"Arroz 5kg Tipo 1","sku":"E2E-001","category":"ALIMENTOS","quantity":12,"minQuantity":3,"unitPrice":26.90}'
curl -s -i -X PUT $API/products/999999 -H "$J" -H "$AUTH" -d "$BODY"

# 12. Id inválido (não numérico) → 400
curl -s -i $API/products/abc -H "$AUTH"

# 13. Excluir → 204 sem corpo; consultar de novo → 404; excluir de novo → 404
curl -s -i -X DELETE $API/products/$ID -H "$AUTH"
curl -s -i $API/products/$ID -H "$AUTH"
```

## Persistência (R-BE-10)

```bash
# 14. Crie um registro, pare o backend (Ctrl+C), suba de novo (./gradlew bootRun) e liste:
curl -s $API/products -H "Authorization: Bearer $(novo login)"   # o registro precisa continuar lá
# Prova mais forte: docker compose down (sem -v) + up -d e repetir.
```

## CORS (R-BE-16)

```bash
# 15. Pré-voo do navegador deve devolver 200/204 com Access-Control-Allow-Origin
curl -s -i -X OPTIONS $API/products \
  -H "Origin: http://localhost:4200" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```

## Segurança dos dados (R-BE-13/14)

```bash
# 16. Nenhuma resposta com campo de senha
curl -s -X POST $API/auth/login -H "$J" -d '{"username":"admin","password":"admin123"}' | grep -ci password   # esperado: 0
# 17. Hash BCrypt no banco (prefixo $2a$/$2b$), nunca texto puro
docker compose exec db psql -U app -d appdb -c "select username, left(password_hash,7) from app_users;"
```

## O que registrar

Para cada passo: comando, status HTTP e trecho relevante do corpo. Se um passo não puder ser executado (por exemplo, sem Docker), marque **NÃO VERIFICADO** com o motivo. Estas evidências viram a seção "Testes e validação" da documentação.
