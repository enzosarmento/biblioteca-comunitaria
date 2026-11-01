# Templates Kotlin (Spring Boot 3.5.x)

Exemplo de domínio: `Product` (controle de estoque). Troque pelo tema real. Pacote base: `com.example.app`. Cada bloco indica o caminho do arquivo. Copie, adapte e **compile**: não assuma que funciona só por ter copiado.

Sumário: 1 Aplicação e propriedades · 2 Segurança · 3 Autenticação · 4 Usuário · 5 Erros · 6 Domínio · 7 Seed · 8 Testes

---

## 1. Aplicação e propriedades

`AppApplication.kt`
```kotlin
package com.example.app

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class AppApplication

fun main(args: Array<String>) {
    runApplication<AppApplication>(*args)
}
```

`config/JwtProperties.kt`
```kotlin
package com.example.app.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.jwt")
data class JwtProperties(
    val secret: String,
    val expirationSeconds: Long = 3600,
    val issuer: String = "app-api",
) {
    init {
        // HS256 exige chave de pelo menos 256 bits; falhar cedo evita rodar com segredo fraco.
        require(secret.toByteArray().size >= 32) {
            "app.jwt.secret precisa ter pelo menos 32 bytes. Defina a variável JWT_SECRET."
        }
    }
}
```

`config/CorsConfig.kt`
```kotlin
package com.example.app.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
class CorsConfig(
    @Value("\${app.cors.allowed-origins}") private val origins: List<String>,
) {
    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration().apply {
            allowedOrigins = origins
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
            allowedHeaders = listOf("Authorization", "Content-Type")
            exposedHeaders = listOf("Location")
            maxAge = 3600
        }
        return UrlBasedCorsConfigurationSource().apply { registerCorsConfiguration("/api/**", config) }
    }
}
```

---

## 2. Segurança

`config/SecurityConfig.kt`
```kotlin
package com.example.app.config

import com.example.app.security.RestAccessDeniedHandler
import com.example.app.security.RestAuthenticationEntryPoint
import com.nimbusds.jose.jwk.source.ImmutableSecret
import com.nimbusds.jose.proc.SecurityContext
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.config.Customizer
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter
import org.springframework.security.web.SecurityFilterChain
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

@Configuration
@EnableWebSecurity
class SecurityConfig(private val jwtProperties: JwtProperties) {

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun authenticationManager(config: AuthenticationConfiguration): AuthenticationManager =
        config.authenticationManager

    @Bean
    fun jwtSecretKey(): SecretKey = SecretKeySpec(jwtProperties.secret.toByteArray(), "HmacSHA256")

    @Bean
    fun jwtEncoder(key: SecretKey): JwtEncoder = NimbusJwtEncoder(ImmutableSecret<SecurityContext>(key))

    // O decoder valida assinatura e expiração (exp). Token adulterado ou vencido nunca chega ao controller.
    @Bean
    fun jwtDecoder(key: SecretKey): JwtDecoder =
        NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build()

    private fun jwtAuthenticationConverter(): JwtAuthenticationConverter {
        val authorities = JwtGrantedAuthoritiesConverter().apply {
            setAuthoritiesClaimName("roles")
            setAuthorityPrefix("ROLE_")
        }
        return JwtAuthenticationConverter().apply { setJwtGrantedAuthoritiesConverter(authorities) }
    }

    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        entryPoint: RestAuthenticationEntryPoint,
        accessDeniedHandler: RestAccessDeniedHandler,
    ): SecurityFilterChain {
        http
            .csrf { it.disable() } // API stateless com Bearer token, sem cookie de sessão
            .cors(Customizer.withDefaults())
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                it.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                    .anyRequest().authenticated()
            }
            .exceptionHandling {
                it.authenticationEntryPoint(entryPoint).accessDeniedHandler(accessDeniedHandler)
            }
            .oauth2ResourceServer { rs ->
                rs.jwt { jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()) }
                    .authenticationEntryPoint(entryPoint)
                    .accessDeniedHandler(accessDeniedHandler)
            }
        return http.build()
    }
}
```

`security/RestAuthenticationEntryPoint.kt` (401) e `RestAccessDeniedHandler.kt` (403)
```kotlin
package com.example.app.security

import com.example.app.common.ApiError
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.AccessDeniedHandler
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.stereotype.Component

internal fun HttpServletResponse.writeApiError(mapper: ObjectMapper, error: ApiError) {
    status = error.status
    contentType = MediaType.APPLICATION_JSON_VALUE
    characterEncoding = Charsets.UTF_8.name()
    mapper.writeValue(outputStream, error)
}

@Component
class RestAuthenticationEntryPoint(private val mapper: ObjectMapper) : AuthenticationEntryPoint {
    override fun commence(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authException: AuthenticationException,
    ) {
        val hasBearer = request.getHeader(HttpHeaders.AUTHORIZATION)
            ?.startsWith("Bearer ", ignoreCase = true) == true
        val causes = generateSequence<Throwable>(authException) { it.cause }
            .joinToString(" | ") { it.message.orEmpty() }

        val (code, message) = when {
            !hasBearer -> "UNAUTHENTICATED" to "Autenticação necessária. Faça login para continuar."
            causes.contains("expired", ignoreCase = true) -> "TOKEN_EXPIRED" to "Sua sessão expirou. Faça login novamente."
            else -> "TOKEN_INVALID" to "Token de acesso inválido. Faça login novamente."
        }
        response.writeApiError(mapper, ApiError(status = 401, code = code, message = message, path = request.requestURI))
    }
}

@Component
class RestAccessDeniedHandler(private val mapper: ObjectMapper) : AccessDeniedHandler {
    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        accessDeniedException: AccessDeniedException,
    ) {
        response.writeApiError(
            mapper,
            ApiError(status = 403, code = "FORBIDDEN", message = "Você não tem permissão para esta operação.", path = request.requestURI),
        )
    }
}
```

---

## 3. Autenticação

`auth/dto/AuthDtos.kt`
```kotlin
package com.example.app.auth.dto

import jakarta.validation.constraints.NotBlank
import java.time.Instant

data class LoginRequest(
    @field:NotBlank(message = "Informe o usuário")
    val username: String,
    @field:NotBlank(message = "Informe a senha")
    val password: String,
)

data class LoginResponse(
    val token: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long,
    val expiresAt: Instant,
    val username: String,
    val role: String,
)
```

`auth/AuthService.kt`
```kotlin
package com.example.app.auth

import com.example.app.auth.dto.LoginRequest
import com.example.app.auth.dto.LoginResponse
import com.example.app.config.JwtProperties
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class AuthService(
    private val authenticationManager: AuthenticationManager,
    private val jwtEncoder: JwtEncoder,
    private val props: JwtProperties,
) {
    /** Lança BadCredentialsException se usuário/senha não conferem (tratada no GlobalExceptionHandler). */
    fun login(request: LoginRequest): LoginResponse {
        val authentication = authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken.unauthenticated(request.username.trim(), request.password),
        )
        val roles = authentication.authorities.map { it.authority.removePrefix("ROLE_") }
        val now = Instant.now()
        val expiresAt = now.plusSeconds(props.expirationSeconds)

        val claims = JwtClaimsSet.builder()
            .issuer(props.issuer)
            .subject(authentication.name)
            .issuedAt(now)
            .expiresAt(expiresAt)
            .claim("roles", roles)
            .build()
        val header = JwsHeader.with(MacAlgorithm.HS256).build()
        val token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).tokenValue

        return LoginResponse(
            token = token,
            expiresIn = props.expirationSeconds,
            expiresAt = expiresAt,
            username = authentication.name,
            role = roles.firstOrNull() ?: "USER",
        )
    }
}
```

`auth/AuthController.kt`
```kotlin
package com.example.app.auth

import com.example.app.auth.dto.LoginRequest
import com.example.app.auth.dto.LoginResponse
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(private val authService: AuthService) {
    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): LoginResponse = authService.login(request)
}
```

---

## 4. Usuário

`user/AppUser.kt`, `user/AppUserRepository.kt`, `user/AppUserDetailsService.kt`
```kotlin
package com.example.app.user

import jakarta.persistence.*
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

enum class Role { ADMIN, USER }

// "app_users": "user" é palavra reservada em PostgreSQL.
@Entity
@Table(name = "app_users")
class AppUser(
    @Column(nullable = false, unique = true, length = 60)
    var username: String,

    @Column(name = "password_hash", nullable = false, length = 100)
    var passwordHash: String, // hash BCrypt, nunca a senha

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var role: Role = Role.USER,

    @Column(nullable = false)
    var enabled: Boolean = true,

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
)

interface AppUserRepository : JpaRepository<AppUser, Long> {
    fun findByUsername(username: String): AppUser?
    fun existsByUsername(username: String): Boolean
}

@Service
class AppUserDetailsService(private val users: AppUserRepository) : UserDetailsService {
    override fun loadUserByUsername(username: String): UserDetails {
        val user = users.findByUsername(username) ?: throw UsernameNotFoundException("Usuário não encontrado")
        return User.withUsername(user.username)
            .password(user.passwordHash)
            .roles(user.role.name)
            .disabled(!user.enabled)
            .build()
    }
}
```
(Separe em três arquivos no projeto real.) O `DaoAuthenticationProvider` converte `UsernameNotFoundException` em `BadCredentialsException`, então usuário inexistente e senha errada dão a mesma resposta.

---

## 5. Erros

`common/ApiError.kt` e `common/Exceptions.kt`
```kotlin
package com.example.app.common

import java.time.Instant

data class FieldErrorDetail(val field: String, val message: String)

data class ApiError(
    val timestamp: Instant = Instant.now(),
    val status: Int,
    val code: String,
    val message: String,
    val path: String,
    val fieldErrors: List<FieldErrorDetail> = emptyList(),
)

class ResourceNotFoundException(message: String) : RuntimeException(message)
class ConflictException(message: String) : RuntimeException(message)
```

`common/GlobalExceptionHandler.kt`
```kotlin
package com.example.app.common

import com.fasterxml.jackson.databind.exc.MismatchedInputException
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.servlet.resource.NoResourceFoundException

@RestControllerAdvice
class GlobalExceptionHandler {
    private val log = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun validation(ex: MethodArgumentNotValidException, req: HttpServletRequest) = build(
        HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
        "Há campos inválidos. Corrija e tente novamente.", req,
        ex.bindingResult.fieldErrors.map { FieldErrorDetail(it.field, it.defaultMessage ?: "Valor inválido") },
    )

    // JSON malformado, tipo errado, ou campo obrigatório ausente em tipo não-nulo do Kotlin.
    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun unreadable(ex: HttpMessageNotReadableException, req: HttpServletRequest): ResponseEntity<ApiError> {
        val mismatch = ex.cause as? MismatchedInputException
        val field = mismatch?.path?.joinToString(".") { it.fieldName ?: "[${it.index}]" }.orEmpty()
        val details = if (field.isNotBlank()) listOf(FieldErrorDetail(field, "Valor ausente ou em formato inválido")) else emptyList()
        return build(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "Corpo da requisição inválido.", req, details)
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun typeMismatch(ex: MethodArgumentTypeMismatchException, req: HttpServletRequest) =
        build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "O parâmetro '${ex.name}' é inválido.", req)

    @ExceptionHandler(ResourceNotFoundException::class, NoResourceFoundException::class)
    fun notFound(ex: Exception, req: HttpServletRequest) =
        build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.message ?: "Recurso não encontrado.", req)

    @ExceptionHandler(ConflictException::class)
    fun conflict(ex: ConflictException, req: HttpServletRequest) =
        build(HttpStatus.CONFLICT, "CONFLICT", ex.message ?: "Conflito de dados.", req)

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun integrity(ex: DataIntegrityViolationException, req: HttpServletRequest): ResponseEntity<ApiError> {
        log.warn("Violação de integridade: {}", ex.mostSpecificCause.message)
        return build(HttpStatus.CONFLICT, "CONFLICT", "A operação viola uma restrição de dados (valor duplicado ou em uso).", req)
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun methodNotAllowed(ex: HttpRequestMethodNotSupportedException, req: HttpServletRequest) =
        build(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "Método HTTP não suportado nesta rota.", req)

    // Lançada pelo AuthenticationManager no login. Mensagem única, sem revelar se o usuário existe.
    @ExceptionHandler(AuthenticationException::class)
    fun badCredentials(ex: AuthenticationException, req: HttpServletRequest) =
        build(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Usuário ou senha inválidos.", req)

    // Sem este handler, o handler genérico abaixo transformaria um 403 (ex.: @PreAuthorize) em 500.
    @ExceptionHandler(AccessDeniedException::class)
    fun forbidden(ex: AccessDeniedException, req: HttpServletRequest) =
        build(HttpStatus.FORBIDDEN, "FORBIDDEN", "Você não tem permissão para esta operação.", req)

    @ExceptionHandler(Exception::class)
    fun unexpected(ex: Exception, req: HttpServletRequest): ResponseEntity<ApiError> {
        log.error("Erro inesperado em {}", req.requestURI, ex)
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Erro interno. Tente novamente mais tarde.", req)
    }

    private fun build(
        status: HttpStatus, code: String, message: String, req: HttpServletRequest,
        fields: List<FieldErrorDetail> = emptyList(),
    ): ResponseEntity<ApiError> =
        ResponseEntity.status(status).body(ApiError(status = status.value(), code = code, message = message, path = req.requestURI, fieldErrors = fields))
}
```

---

## 6. Domínio (exemplo: Product)

`product/Product.kt`
```kotlin
package com.example.app.product

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

enum class ProductCategory { ALIMENTOS, BEBIDAS, LIMPEZA, HIGIENE, PAPELARIA, OUTROS }

// class comum (NÃO data class): Hibernate precisa de proxies e identidade estável.
@Entity
@Table(name = "products", uniqueConstraints = [UniqueConstraint(name = "uk_products_sku", columnNames = ["sku"])])
class Product(
    @Column(nullable = false, length = 120) var name: String,
    @Column(nullable = false, length = 40) var sku: String,
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) var category: ProductCategory,
    @Column(nullable = false) var quantity: Int,
    @Column(name = "min_quantity", nullable = false) var minQuantity: Int,
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2) var unitPrice: BigDecimal,
    @Column(name = "expiration_date") var expirationDate: LocalDate? = null,
    @Column(length = 500) var description: String? = null,
    @Column(nullable = false) var active: Boolean = true,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now(),
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) val id: Long? = null,
) {
    @PreUpdate
    fun touch() { updatedAt = Instant.now() }
}
```

`product/ProductRepository.kt`
```kotlin
package com.example.app.product

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface ProductRepository : JpaRepository<Product, Long> {
    fun existsBySku(sku: String): Boolean
    fun existsBySkuAndIdNot(sku: String, id: Long): Boolean

    @Query(
        """select p from Product p
           where lower(p.name) like lower(concat('%', :q, '%')) or lower(p.sku) like lower(concat('%', :q, '%'))
           order by p.name""",
    )
    fun search(@Param("q") q: String): List<Product>
}
```

`product/dto/ProductDtos.kt`
```kotlin
package com.example.app.product.dto

import com.example.app.product.ProductCategory
import jakarta.validation.constraints.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

/**
 * Campos obrigatórios que não são String (Int, BigDecimal, enum) são declarados anuláveis
 * + @field:NotNull. Assim um JSON sem o campo gera erro 400 POR CAMPO ("A quantidade é obrigatória"),
 * em vez de uma falha genérica de desserialização.
 */
data class ProductRequest(
    @field:NotBlank(message = "O nome é obrigatório")
    @field:Size(min = 3, max = 120, message = "O nome deve ter entre 3 e 120 caracteres")
    val name: String,

    @field:NotBlank(message = "O SKU é obrigatório")
    @field:Size(min = 3, max = 40, message = "O SKU deve ter entre 3 e 40 caracteres")
    val sku: String,

    @field:NotNull(message = "A categoria é obrigatória")
    val category: ProductCategory?,

    @field:NotNull(message = "A quantidade é obrigatória")
    @field:Min(value = 0, message = "A quantidade não pode ser negativa")
    val quantity: Int?,

    @field:NotNull(message = "A quantidade mínima é obrigatória")
    @field:Min(value = 0, message = "A quantidade mínima não pode ser negativa")
    val minQuantity: Int?,

    @field:NotNull(message = "O preço unitário é obrigatório")
    @field:DecimalMin(value = "0.01", message = "O preço deve ser maior que zero")
    @field:Digits(integer = 10, fraction = 2, message = "O preço aceita no máximo 2 casas decimais")
    val unitPrice: BigDecimal?,

    val expirationDate: LocalDate? = null,

    @field:Size(max = 500, message = "A descrição deve ter no máximo 500 caracteres")
    val description: String? = null,

    val active: Boolean = true,
)

data class ProductResponse(
    val id: Long,
    val name: String,
    val sku: String,
    val category: ProductCategory,
    val quantity: Int,
    val minQuantity: Int,
    val unitPrice: BigDecimal,
    val expirationDate: LocalDate?,
    val description: String?,
    val active: Boolean,
    val lowStock: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)
```

`product/ProductMapper.kt`
```kotlin
package com.example.app.product

import com.example.app.product.dto.ProductRequest
import com.example.app.product.dto.ProductResponse

fun ProductRequest.toEntity() = Product(
    name = name.trim(), sku = sku.trim(), category = category!!, quantity = quantity!!,
    minQuantity = minQuantity!!, unitPrice = unitPrice!!, expirationDate = expirationDate,
    description = description?.trim()?.ifBlank { null }, active = active,
)

fun Product.applyChanges(r: ProductRequest) {
    name = r.name.trim(); sku = r.sku.trim(); category = r.category!!; quantity = r.quantity!!
    minQuantity = r.minQuantity!!; unitPrice = r.unitPrice!!; expirationDate = r.expirationDate
    description = r.description?.trim()?.ifBlank { null }; active = r.active
}

fun Product.toResponse() = ProductResponse(
    id = id!!, name = name, sku = sku, category = category, quantity = quantity, minQuantity = minQuantity,
    unitPrice = unitPrice, expirationDate = expirationDate, description = description, active = active,
    lowStock = quantity <= minQuantity, createdAt = createdAt, updatedAt = updatedAt,
)
```
Os `!!` são seguros porque a validação já garantiu não-nulo antes de chegar ao service.

`product/ProductService.kt`
```kotlin
package com.example.app.product

import com.example.app.common.ConflictException
import com.example.app.common.ResourceNotFoundException
import com.example.app.product.dto.ProductRequest
import com.example.app.product.dto.ProductResponse
import org.springframework.data.domain.Sort
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class ProductService(private val repository: ProductRepository) {

    fun findAll(query: String?): List<ProductResponse> {
        val products = if (query.isNullOrBlank()) repository.findAll(Sort.by("name")) else repository.search(query.trim())
        return products.map { it.toResponse() }
    }

    fun findById(id: Long): ProductResponse = getOrThrow(id).toResponse()

    @Transactional
    fun create(request: ProductRequest): ProductResponse {
        if (repository.existsBySku(request.sku.trim())) {
            throw ConflictException("Já existe um produto com o SKU '${request.sku.trim()}'.")
        }
        return repository.save(request.toEntity()).toResponse()
    }

    @Transactional
    fun update(id: Long, request: ProductRequest): ProductResponse {
        val product = getOrThrow(id)
        if (repository.existsBySkuAndIdNot(request.sku.trim(), id)) {
            throw ConflictException("Já existe outro produto com o SKU '${request.sku.trim()}'.")
        }
        product.applyChanges(request)
        return product.toResponse() // entidade gerenciada: o flush grava no commit
    }

    @Transactional
    fun delete(id: Long) = repository.delete(getOrThrow(id))

    private fun getOrThrow(id: Long): Product =
        repository.findByIdOrNull(id) ?: throw ResourceNotFoundException("Produto com id $id não encontrado.")
}
```

`product/ProductController.kt`
```kotlin
package com.example.app.product

import com.example.app.product.dto.ProductRequest
import com.example.app.product.dto.ProductResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.servlet.support.ServletUriComponentsBuilder

@RestController
@RequestMapping("/api/products")
class ProductController(private val service: ProductService) {

    @GetMapping
    fun list(@RequestParam(required = false) q: String?): List<ProductResponse> = service.findAll(q)

    @GetMapping("/{id}")
    fun get(@PathVariable id: Long): ProductResponse = service.findById(id)

    @PostMapping
    fun create(@Valid @RequestBody request: ProductRequest): ResponseEntity<ProductResponse> {
        val created = service.create(request)
        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}").buildAndExpand(created.id).toUri()
        return ResponseEntity.created(location).body(created) // 201 + Location
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @Valid @RequestBody request: ProductRequest): ProductResponse =
        service.update(id, request)

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: Long) = service.delete(id)
}
```

---

## 7. Seed

`config/DataInitializer.kt`
```kotlin
package com.example.app.config

import com.example.app.product.*
import com.example.app.user.*
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Component
class DataInitializer(
    private val users: AppUserRepository,
    private val products: ProductRepository,
    private val encoder: PasswordEncoder,
    @Value("\${app.seed.admin-username}") private val adminUsername: String,
    @Value("\${app.seed.admin-password}") private val adminPassword: String,
    @Value("\${app.seed.sample-data}") private val sampleData: Boolean,
) : ApplicationRunner {

    @Transactional
    override fun run(args: ApplicationArguments) {
        if (!users.existsByUsername(adminUsername)) {
            users.save(AppUser(username = adminUsername, passwordHash = encoder.encode(adminPassword)!!, role = Role.ADMIN))
        }
        if (sampleData && products.count() == 0L) {
            products.saveAll(
                listOf(
                    Product("Arroz Branco 5kg", "ARZ-001", ProductCategory.ALIMENTOS, 40, 10, BigDecimal("28.90")),
                    Product("Detergente Neutro 500ml", "DET-014", ProductCategory.LIMPEZA, 6, 12, BigDecimal("2.79")),
                    // ... 8 a 12 registros realistas no total
                ),
            )
        }
    }
}
```

---

## 8. Testes (MockMvc, perfil `test` com H2)

`src/test/kotlin/.../product/ProductControllerTest.kt`
```kotlin
package com.example.app.product

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.*
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.*
import java.time.Instant

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductControllerTest(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val mapper: ObjectMapper,
    @Autowired private val jwtEncoder: JwtEncoder,
    @Autowired private val repository: ProductRepository,
) {
    @BeforeEach
    fun clean() = repository.deleteAll()

    private fun token(): String {
        val body = mapper.writeValueAsString(mapOf("username" to "admin", "password" to "admin123"))
        val res = mockMvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON; content = body
        }.andExpect { status { isOk() } }.andReturn()
        return mapper.readTree(res.response.contentAsString)["token"].asText()
    }

    private fun validBody(sku: String = "SKU-001") = mapper.writeValueAsString(
        mapOf("name" to "Arroz 5kg", "sku" to sku, "category" to "ALIMENTOS",
              "quantity" to 10, "minQuantity" to 3, "unitPrice" to 25.5),
    )

    @Test
    fun `login com senha errada retorna 401 INVALID_CREDENTIALS`() {
        mockMvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"username":"admin","password":"errada"}"""
        }.andExpect { status { isUnauthorized() }; jsonPath("$.code") { value("INVALID_CREDENTIALS") } }
    }

    @Test
    fun `sem token retorna 401 UNAUTHENTICATED`() {
        mockMvc.get("/api/products").andExpect { status { isUnauthorized() }; jsonPath("$.code") { value("UNAUTHENTICATED") } }
    }

    @Test
    fun `token adulterado retorna 401 TOKEN_INVALID`() {
        mockMvc.get("/api/products") { header("Authorization", "Bearer ${token()}x") }
            .andExpect { status { isUnauthorized() }; jsonPath("$.code") { value("TOKEN_INVALID") } }
    }

    @Test
    fun `token expirado retorna 401 TOKEN_EXPIRED`() {
        val now = Instant.now()
        val claims = JwtClaimsSet.builder().subject("admin").claim("roles", listOf("ADMIN"))
            .issuedAt(now.minusSeconds(7200)).expiresAt(now.minusSeconds(3600)).build()
        val expired = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).tokenValue
        mockMvc.get("/api/products") { header("Authorization", "Bearer $expired") }
            .andExpect { status { isUnauthorized() }; jsonPath("$.code") { value("TOKEN_EXPIRED") } }
    }

    @Test
    fun `fluxo CRUD completo`() {
        val auth = "Bearer ${token()}"
        val created = mockMvc.post("/api/products") {
            header("Authorization", auth); contentType = MediaType.APPLICATION_JSON; content = validBody()
        }.andExpect { status { isCreated() }; header { exists("Location") } }.andReturn()
        val id = mapper.readTree(created.response.contentAsString)["id"].asLong()

        mockMvc.get("/api/products/$id") { header("Authorization", auth) }
            .andExpect { status { isOk() }; jsonPath("$.sku") { value("SKU-001") } }

        mockMvc.post("/api/products") {
            header("Authorization", auth); contentType = MediaType.APPLICATION_JSON; content = validBody()
        }.andExpect { status { isConflict() } }

        mockMvc.put("/api/products/$id") {
            header("Authorization", auth); contentType = MediaType.APPLICATION_JSON; content = validBody("SKU-002")
        }.andExpect { status { isOk() }; jsonPath("$.sku") { value("SKU-002") } }

        mockMvc.delete("/api/products/$id") { header("Authorization", auth) }.andExpect { status { isNoContent() } }
        mockMvc.get("/api/products/$id") { header("Authorization", auth) }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `dados invalidos retornam 400 com erros por campo`() {
        mockMvc.post("/api/products") {
            header("Authorization", "Bearer ${token()}"); contentType = MediaType.APPLICATION_JSON
            content = """{"name":"ab","sku":"","quantity":-1}"""
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value("VALIDATION_ERROR") }
            jsonPath("$.fieldErrors") { isNotEmpty() }
        }
    }
}
```
Teste adicional recomendado: nenhum JSON de resposta do login ou de `/api/**` contém `password`.
