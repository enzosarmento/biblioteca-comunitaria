package com.biblioteca.common

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
    fun validation(ex: MethodArgumentNotValidException, req: HttpServletRequest): ResponseEntity<ApiError> =
        build(
            HttpStatus.BAD_REQUEST,
            "VALIDATION_ERROR",
            "Há campos inválidos. Corrija e tente novamente.",
            req,
            ex.bindingResult.fieldErrors.map {
                FieldErrorDetail(it.field, it.defaultMessage ?: "Valor inválido")
            },
        )

    @ExceptionHandler(BusinessValidationException::class)
    fun businessValidation(ex: BusinessValidationException, req: HttpServletRequest): ResponseEntity<ApiError> =
        build(
            HttpStatus.BAD_REQUEST,
            "VALIDATION_ERROR",
            ex.message,
            req,
            listOf(FieldErrorDetail(ex.field, ex.message)),
        )

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun unreadable(ex: HttpMessageNotReadableException, req: HttpServletRequest): ResponseEntity<ApiError> {
        val mismatch = ex.cause as? MismatchedInputException
        val field = mismatch?.path?.joinToString(".") { it.fieldName ?: "[${it.index}]" }.orEmpty()
        val details = if (field.isNotBlank()) {
            listOf(FieldErrorDetail(field, "Valor ausente ou em formato inválido"))
        } else {
            emptyList()
        }
        return build(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "Corpo da requisição inválido.", req, details)
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun typeMismatch(ex: MethodArgumentTypeMismatchException, req: HttpServletRequest): ResponseEntity<ApiError> =
        build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "O parâmetro '${ex.name}' é inválido.", req)

    @ExceptionHandler(ResourceNotFoundException::class, NoResourceFoundException::class)
    fun notFound(ex: Exception, req: HttpServletRequest): ResponseEntity<ApiError> =
        build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.message ?: "Recurso não encontrado.", req)

    @ExceptionHandler(ConflictException::class)
    fun conflict(ex: ConflictException, req: HttpServletRequest): ResponseEntity<ApiError> =
        build(HttpStatus.CONFLICT, "CONFLICT", ex.message ?: "Conflito de dados.", req)

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun integrity(ex: DataIntegrityViolationException, req: HttpServletRequest): ResponseEntity<ApiError> {
        log.warn("Violação de integridade: {}", ex.mostSpecificCause.message)
        return build(
            HttpStatus.CONFLICT,
            "CONFLICT",
            "A operação viola uma restrição de dados (valor duplicado ou em uso).",
            req,
        )
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun methodNotAllowed(ex: HttpRequestMethodNotSupportedException, req: HttpServletRequest): ResponseEntity<ApiError> =
        build(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "Método HTTP não suportado nesta rota.", req)

    // Mesma mensagem para usuário inexistente e senha incorreta (previne enumeração de usuários).
    @ExceptionHandler(AuthenticationException::class)
    fun badCredentials(ex: AuthenticationException, req: HttpServletRequest): ResponseEntity<ApiError> =
        build(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Usuário ou senha inválidos.", req)

    @ExceptionHandler(AccessDeniedException::class)
    fun forbidden(ex: AccessDeniedException, req: HttpServletRequest): ResponseEntity<ApiError> =
        build(HttpStatus.FORBIDDEN, "FORBIDDEN", "Você não tem permissão para esta operação.", req)

    @ExceptionHandler(Exception::class)
    fun unexpected(ex: Exception, req: HttpServletRequest): ResponseEntity<ApiError> {
        log.error("Erro inesperado em {}", req.requestURI, ex)
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Erro interno. Tente novamente mais tarde.", req)
    }

    private fun build(
        status: HttpStatus,
        code: String,
        message: String,
        req: HttpServletRequest,
        fields: List<FieldErrorDetail> = emptyList(),
    ): ResponseEntity<ApiError> =
        ResponseEntity.status(status).body(
            ApiError(
                status = status.value(),
                code = code,
                message = message,
                path = req.requestURI,
                fieldErrors = fields,
            ),
        )
}

