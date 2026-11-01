package com.biblioteca.auth

import com.biblioteca.auth.dto.LoginRequest
import com.biblioteca.auth.dto.LoginResponse
import com.biblioteca.config.JwtProperties
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

