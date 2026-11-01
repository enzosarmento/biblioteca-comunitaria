package com.biblioteca.auth

import com.biblioteca.config.JwtProperties
import com.biblioteca.user.AppUserRepository
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.options
import org.springframework.test.web.servlet.post
import java.time.Instant

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val mapper: ObjectMapper,
    @Autowired private val jwtEncoder: JwtEncoder,
    @Autowired private val jwtProperties: JwtProperties,
    @Autowired private val userRepository: AppUserRepository,
) {

    private fun obtainValidToken(): String {
        val res = mockMvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"username":"admin","password":"admin123"}"""
        }.andExpect { status { isOk() } }.andReturn()
        return mapper.readTree(res.response.contentAsString)["token"].asText()
    }

    @Test
    fun `login com credenciais validas retorna 200 token JWT com exp e nao expoe senha`() {
        val result = mockMvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"username":"admin","password":"admin123"}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.token") { isNotEmpty() }
            jsonPath("$.tokenType") { value("Bearer") }
            jsonPath("$.expiresIn") { value(3600) }
            jsonPath("$.expiresAt") { isNotEmpty() }
            jsonPath("$.username") { value("admin") }
            jsonPath("$.role") { value("ADMIN") }
        }.andReturn()

        val body = result.response.contentAsString
        assertFalse(body.contains("password", ignoreCase = true))

        val admin = userRepository.findByUsername("admin")!!
        assertTrue(admin.passwordHash.startsWith("\$2"))
    }

    @Test
    fun `login com senha incorreta e usuario inexistente retornam 401 INVALID_CREDENTIALS com mesma mensagem`() {
        val wrongPass = mockMvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"username":"admin","password":"senha-errada"}"""
        }.andExpect {
            status { isUnauthorized() }
            jsonPath("$.code") { value("INVALID_CREDENTIALS") }
            jsonPath("$.message") { value("Usuário ou senha inválidos.") }
        }.andReturn()

        val unknownUser = mockMvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"username":"inexistente","password":"qualquer"}"""
        }.andExpect {
            status { isUnauthorized() }
            jsonPath("$.code") { value("INVALID_CREDENTIALS") }
            jsonPath("$.message") { value("Usuário ou senha inválidos.") }
        }.andReturn()

        val msg1 = mapper.readTree(wrongPass.response.contentAsString)["message"].asText()
        val msg2 = mapper.readTree(unknownUser.response.contentAsString)["message"].asText()
        assertTrue(msg1 == msg2)
    }

    @Test
    fun `login com campos vazios retorna 400 VALIDATION_ERROR`() {
        mockMvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"username":"","password":""}"""
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value("VALIDATION_ERROR") }
            jsonPath("$.fieldErrors.length()") { value(2) }
        }
    }

    @Test
    fun `acesso sem token retorna 401 UNAUTHENTICATED`() {
        mockMvc.get("/api/books").andExpect {
            status { isUnauthorized() }
            jsonPath("$.code") { value("UNAUTHENTICATED") }
        }
    }

    @Test
    fun `acesso com token adulterado retorna 401 TOKEN_INVALID`() {
        val tampered = "${obtainValidToken()}adulterado"
        mockMvc.get("/api/books") {
            header("Authorization", "Bearer $tampered")
        }.andExpect {
            status { isUnauthorized() }
            jsonPath("$.code") { value("TOKEN_INVALID") }
        }
    }

    @Test
    fun `acesso com token expirado retorna 401 TOKEN_EXPIRED`() {
        val now = Instant.now()
        val claims = JwtClaimsSet.builder()
            .issuer(jwtProperties.issuer)
            .subject("admin")
            .claim("roles", listOf("ADMIN"))
            .issuedAt(now.minusSeconds(7200))
            .expiresAt(now.minusSeconds(3600))
            .build()
        val expiredToken = jwtEncoder.encode(
            JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims),
        ).tokenValue

        mockMvc.get("/api/books") {
            header("Authorization", "Bearer $expiredToken")
        }.andExpect {
            status { isUnauthorized() }
            jsonPath("$.code") { value("TOKEN_EXPIRED") }
        }
    }

    @Test
    fun `preflight CORS para origem do Angular retorna 200 com cabecalhos permitidos`() {
        mockMvc.options("/api/books") {
            header("Origin", "http://localhost:4200")
            header("Access-Control-Request-Method", "POST")
            header("Access-Control-Request-Headers", "Authorization, Content-Type")
        }.andExpect {
            status { isOk() }
            header { string("Access-Control-Allow-Origin", "http://localhost:4200") }
        }
    }
}

