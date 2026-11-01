package com.biblioteca.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.jwt")
data class JwtProperties(
    val secret: String,
    val expirationSeconds: Long = 3600,
    val clockSkewSeconds: Long = 60,
    val issuer: String = "biblioteca-api",
) {
    init {
        // HS256 exige chave de pelo menos 256 bits (32 bytes); falhar na subida impede chave fraca.
        require(secret.toByteArray(Charsets.UTF_8).size >= 32) {
            "app.jwt.secret precisa ter pelo menos 32 bytes. Defina a variável de ambiente JWT_SECRET."
        }
    }
}

