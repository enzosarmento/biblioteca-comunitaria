# Build, configuração e infraestrutura

Versões abaixo são pontos de partida: confirme as últimas estáveis compatíveis entre si (Spring Boot ↔ Kotlin ↔ Gradle). Substitua `com.example.app` e `app` pelo nome real.

## `backend/build.gradle.kts`

```kotlin
plugins {
    kotlin("jvm") version "2.1.21"
    kotlin("plugin.spring") version "2.1.21"
    kotlin("plugin.jpa") version "2.1.21"
    id("org.springframework.boot") version "3.5.6"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"

java {
    toolchain { languageVersion = JavaLanguageVersion.of(21) }
}

repositories { mavenCentral() }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("com.h2database:h2")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> { useJUnitPlatform() }
```

Notas:
- `allOpen` para entidades evita proxies quebrados do Hibernate (lazy). Mantenha.
- H2 é só `testRuntimeOnly`. Ele **não** é o banco da aplicação.
- Gere o wrapper (`gradle wrapper`) ou use o do Initializr, para que `./gradlew` funcione.

## `backend/src/main/resources/application.yml`

```yaml
spring:
  application:
    name: app
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/appdb}
    username: ${DB_USER:app}
    password: ${DB_PASSWORD:app}
  jpa:
    hibernate:
      ddl-auto: update        # dados persistem entre reinícios; nunca create/create-drop aqui
    open-in-view: false
    properties:
      hibernate.format_sql: false

server:
  port: 8080

app:
  jwt:
    # DESENVOLVIMENTO APENAS: em qualquer outro ambiente defina JWT_SECRET (>= 32 caracteres aleatórios)
    secret: ${JWT_SECRET:dev-only-insecure-secret-change-me-0123456789}
    expiration-seconds: ${JWT_EXPIRATION_SECONDS:3600}
    issuer: app-api
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:4200}
  seed:
    admin-username: ${SEED_ADMIN_USERNAME:admin}
    admin-password: ${SEED_ADMIN_PASSWORD:admin123}
    sample-data: ${SEED_SAMPLE_DATA:true}

logging:
  level:
    org.springframework.security: INFO
```

## `backend/src/test/resources/application-test.yml`

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: create-drop
app:
  jwt:
    secret: test-secret-test-secret-test-secret-0123456789
    expiration-seconds: 3600
  seed:
    sample-data: false
```

## `docker-compose.yml` (raiz)

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: app-db
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data     # é isto que mantém os dados após reiniciar
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  pgdata:
```

Comandos: `docker compose up -d` sobe o banco; `docker compose down` mantém os dados; `docker compose down -v` apaga o volume (perde dados: avise na documentação).

## `.env.example` (raiz)

```
DB_URL=jdbc:postgresql://localhost:5432/appdb
DB_USER=app
DB_PASSWORD=app
JWT_SECRET=troque-por-um-segredo-aleatorio-com-pelo-menos-32-caracteres
JWT_EXPIRATION_SECONDS=3600
CORS_ALLOWED_ORIGINS=http://localhost:4200
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=admin123
```

## `.gitignore` (mínimo)

```
.env
backend/build/
backend/.gradle/
backend/data/
frontend/node_modules/
frontend/dist/
frontend/.angular/
*.log
.idea/
```

## Alternativa sem Docker (H2 em arquivo)

Somente se o usuário não puder usar Docker. Adicione `runtimeOnly("com.h2database:h2")` e um `application-h2.yml`:

```yaml
spring:
  datasource:
    url: jdbc:h2:file:./data/appdb;AUTO_SERVER=TRUE
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: update
```

Rode com `SPRING_PROFILES_ACTIVE=h2`. Documente que os dados ficam em `backend/data/`.
