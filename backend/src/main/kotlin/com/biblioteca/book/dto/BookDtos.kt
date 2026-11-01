package com.biblioteca.book.dto

import com.biblioteca.book.BookGenre
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.PastOrPresent
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate

data class BookRequest(
    @field:NotBlank(message = "O título é obrigatório")
    @field:Size(min = 2, max = 150, message = "O título deve ter entre 2 e 150 caracteres")
    val title: String,

    @field:NotBlank(message = "O autor é obrigatório")
    @field:Size(min = 3, max = 120, message = "O autor deve ter entre 3 e 120 caracteres")
    val author: String,

    @field:NotBlank(message = "O ISBN é obrigatório")
    @field:Size(min = 10, max = 20, message = "O ISBN deve ter entre 10 e 20 caracteres")
    @field:Pattern(
        regexp = "^[0-9\\-]{9,19}[0-9Xx]$",
        message = "Informe um ISBN válido (apenas números, hífens e eventual X final)",
    )
    val isbn: String,

    @field:NotBlank(message = "A editora é obrigatória")
    @field:Size(min = 2, max = 100, message = "A editora deve ter entre 2 e 100 caracteres")
    val publisher: String,

    @field:NotNull(message = "O ano de publicação é obrigatório")
    @field:Min(value = 1450, message = "O ano de publicação deve ser a partir de 1450")
    @field:Max(value = 2026, message = "O ano de publicação não pode ser superior a 2026")
    val publicationYear: Int?,

    @field:NotNull(message = "O gênero literário é obrigatório")
    val genre: BookGenre?,

    @field:NotNull(message = "O total de exemplares é obrigatório")
    @field:Min(value = 1, message = "O total de exemplares deve ser pelo menos 1")
    val copiesTotal: Int?,

    @field:NotNull(message = "A quantidade disponível é obrigatória")
    @field:Min(value = 0, message = "A quantidade disponível não pode ser negativa")
    val copiesAvailable: Int?,

    @field:NotBlank(message = "A localização na estante é obrigatória")
    @field:Size(min = 2, max = 60, message = "A localização deve ter entre 2 e 60 caracteres")
    val location: String,

    @field:PastOrPresent(message = "A data de aquisição não pode ser futura")
    val acquisitionDate: LocalDate? = null,

    @field:Size(max = 1000, message = "A sinopse deve ter no máximo 1000 caracteres")
    val synopsis: String? = null,

    val active: Boolean = true,
)

data class BookResponse(
    val id: Long,
    val title: String,
    val author: String,
    val isbn: String,
    val publisher: String,
    val publicationYear: Int,
    val genre: BookGenre,
    val copiesTotal: Int,
    val copiesAvailable: Int,
    val location: String,
    val acquisitionDate: LocalDate?,
    val synopsis: String?,
    val active: Boolean,
    val available: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

