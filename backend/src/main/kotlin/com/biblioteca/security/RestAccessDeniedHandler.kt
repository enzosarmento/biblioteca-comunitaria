package com.biblioteca.security

import com.biblioteca.common.ApiError
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.stereotype.Component

@Component
class RestAccessDeniedHandler(private val mapper: ObjectMapper) : AccessDeniedHandler {
    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        accessDeniedException: AccessDeniedException,
    ) {
        response.writeApiError(
            mapper,
            ApiError(
                status = 403,
                code = "FORBIDDEN",
                message = "Você não tem permissão para esta operação.",
                path = request.requestURI,
            ),
        )
    }
}

