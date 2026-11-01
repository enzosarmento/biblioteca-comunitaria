package com.biblioteca.book

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BookControllerTest(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val mapper: ObjectMapper,
    @Autowired private val repository: BookRepository,
) {
    @BeforeEach
    fun clean() {
        repository.deleteAll()
    }

    private fun bearerToken(): String {
        val res = mockMvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"username":"admin","password":"admin123"}"""
        }.andExpect { status { isOk() } }.andReturn()
        return "Bearer ${mapper.readTree(res.response.contentAsString)["token"].asText()}"
    }

    private fun validBookPayload(
        title: String = "Dom Casmurro",
        author: String = "Machado de Assis",
        isbn: String = "978-85-359-0277-8",
        copiesTotal: Int = 4,
        copiesAvailable: Int = 2,
    ): String = mapper.writeValueAsString(
        mapOf(
            "title" to title,
            "author" to author,
            "isbn" to isbn,
            "publisher" to "Companhia das Letras",
            "publicationYear" to 1899,
            "genre" to "ROMANCE",
            "copiesTotal" to copiesTotal,
            "copiesAvailable" to copiesAvailable,
            "location" to "Corredor A - Estante 1",
            "acquisitionDate" to "2024-03-15",
            "synopsis" to "Obra clássica da literatura brasileira.",
            "active" to true,
        ),
    )

    @Test
    fun `fluxo CRUD completo cria lista busca atualiza e exclui livro`() {
        val auth = bearerToken()

        val createdRes = mockMvc.post("/api/books") {
            header("Authorization", auth)
            contentType = MediaType.APPLICATION_JSON
            content = validBookPayload()
        }.andExpect {
            status { isCreated() }
            header { exists("Location") }
            jsonPath("$.title") { value("Dom Casmurro") }
            jsonPath("$.available") { value(true) }
        }.andReturn()

        val id = mapper.readTree(createdRes.response.contentAsString)["id"].asLong()

        mockMvc.get("/api/books") {
            header("Authorization", auth)
        }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(1) }
        }

        mockMvc.get("/api/books/$id") {
            header("Authorization", auth)
        }.andExpect {
            status { isOk() }
            jsonPath("$.isbn") { value("978-85-359-0277-8") }
        }

        mockMvc.put("/api/books/$id") {
            header("Authorization", auth)
            contentType = MediaType.APPLICATION_JSON
            content = validBookPayload(
                title = "Dom Casmurro - Edição Comentada",
                isbn = "978-85-359-0277-8",
                copiesTotal = 4,
                copiesAvailable = 0,
            )
        }.andExpect {
            status { isOk() }
            jsonPath("$.title") { value("Dom Casmurro - Edição Comentada") }
            jsonPath("$.available") { value(false) }
        }

        mockMvc.delete("/api/books/$id") {
            header("Authorization", auth)
        }.andExpect {
            status { isNoContent() }
        }

        mockMvc.get("/api/books/$id") {
            header("Authorization", auth)
        }.andExpect {
            status { isNotFound() }
            jsonPath("$.code") { value("NOT_FOUND") }
        }
    }

    @Test
    fun `busca textual filtra livros por titulo autor ou ISBN`() {
        val auth = bearerToken()
        mockMvc.post("/api/books") {
            header("Authorization", auth)
            contentType = MediaType.APPLICATION_JSON
            content = validBookPayload(title = "Vidas Secas", author = "Graciliano Ramos", isbn = "978-85-01-01207-4")
        }.andExpect { status { isCreated() } }

        mockMvc.post("/api/books") {
            header("Authorization", auth)
            contentType = MediaType.APPLICATION_JSON
            content = validBookPayload(title = "A Hora da Estrela", author = "Clarice Lispector", isbn = "978-85-325-3078-3")
        }.andExpect { status { isCreated() } }

        mockMvc.get("/api/books?q=clarice") {
            header("Authorization", auth)
        }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(1) }
            jsonPath("$[0].title") { value("A Hora da Estrela") }
        }
    }

    @Test
    fun `ISBN duplicado retorna 409 CONFLICT`() {
        val auth = bearerToken()
        mockMvc.post("/api/books") {
            header("Authorization", auth)
            contentType = MediaType.APPLICATION_JSON
            content = validBookPayload()
        }.andExpect { status { isCreated() } }

        mockMvc.post("/api/books") {
            header("Authorization", auth)
            contentType = MediaType.APPLICATION_JSON
            content = validBookPayload(title = "Outra Edição")
        }.andExpect {
            status { isConflict() }
            jsonPath("$.code") { value("CONFLICT") }
        }
    }

    @Test
    fun `dados invalidos retornam 400 VALIDATION_ERROR com fieldErrors`() {
        val auth = bearerToken()
        mockMvc.post("/api/books") {
            header("Authorization", auth)
            contentType = MediaType.APPLICATION_JSON
            content = """{"title":"A","author":"","isbn":"abc","publisher":"","publicationYear":1200,"copiesTotal":0,"copiesAvailable":-1,"location":""}"""
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value("VALIDATION_ERROR") }
            jsonPath("$.fieldErrors") { isNotEmpty() }
        }
    }

    @Test
    fun `quantidade disponivel maior que total retorna 400 VALIDATION_ERROR em copiesAvailable`() {
        val auth = bearerToken()
        mockMvc.post("/api/books") {
            header("Authorization", auth)
            contentType = MediaType.APPLICATION_JSON
            content = validBookPayload(copiesTotal = 2, copiesAvailable = 5)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value("VALIDATION_ERROR") }
            jsonPath("$.fieldErrors[0].field") { value("copiesAvailable") }
        }
    }

    @Test
    fun `JSON malformado retorna 400 MALFORMED_REQUEST`() {
        val auth = bearerToken()
        mockMvc.post("/api/books") {
            header("Authorization", auth)
            contentType = MediaType.APPLICATION_JSON
            content = """{"title": "Incompleto""""
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value("MALFORMED_REQUEST") }
        }
    }

    @Test
    fun `id inexistente em PUT e DELETE retorna 404 e id invalido retorna 400`() {
        val auth = bearerToken()

        mockMvc.put("/api/books/999999") {
            header("Authorization", auth)
            contentType = MediaType.APPLICATION_JSON
            content = validBookPayload()
        }.andExpect {
            status { isNotFound() }
            jsonPath("$.code") { value("NOT_FOUND") }
        }

        mockMvc.delete("/api/books/999999") {
            header("Authorization", auth)
        }.andExpect {
            status { isNotFound() }
            jsonPath("$.code") { value("NOT_FOUND") }
        }

        mockMvc.get("/api/books/nao-numerico") {
            header("Authorization", auth)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value("VALIDATION_ERROR") }
        }
    }
}

