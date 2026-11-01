package com.biblioteca.security

import com.biblioteca.common.ApiError
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.security.core.AuthenticationException
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
        response.writeApiError(
            mapper,
            ApiError(status = 401, code = code, message = message, path = request.requestURI),
        )
    }
}

