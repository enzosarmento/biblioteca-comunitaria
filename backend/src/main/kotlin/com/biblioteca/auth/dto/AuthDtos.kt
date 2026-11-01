package com.biblioteca.auth.dto

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

