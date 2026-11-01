package com.biblioteca.book

import com.biblioteca.book.dto.BookRequest
import com.biblioteca.book.dto.BookResponse
import com.biblioteca.common.BusinessValidationException
import com.biblioteca.common.ConflictException
import com.biblioteca.common.ResourceNotFoundException
import org.springframework.data.domain.Sort
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Year

@Service
@Transactional(readOnly = true)
class BookService(private val repository: BookRepository) {

    fun findAll(query: String?): List<BookResponse> {
        val books = if (query.isNullOrBlank()) {
            repository.findAll(Sort.by("title"))
        } else {
            repository.search(query.trim())
        }
        return books.map { it.toResponse() }
    }

    fun findById(id: Long): BookResponse = getOrThrow(id).toResponse()

    @Transactional
    fun create(request: BookRequest): BookResponse {
        validateBusinessRules(request)
        val normalizedIsbn = request.isbn.trim().uppercase()
        if (repository.existsByIsbnIgnoreCase(normalizedIsbn)) {
            throw ConflictException("Já existe um livro cadastrado com o ISBN '$normalizedIsbn'.")
        }
        return repository.save(request.toEntity()).toResponse()
    }

    @Transactional
    fun update(id: Long, request: BookRequest): BookResponse {
        validateBusinessRules(request)
        val book = getOrThrow(id)
        val normalizedIsbn = request.isbn.trim().uppercase()
        if (repository.existsByIsbnIgnoreCaseAndIdNot(normalizedIsbn, id)) {
            throw ConflictException("Já existe outro livro cadastrado com o ISBN '$normalizedIsbn'.")
        }
        book.applyChanges(request)
        return book.toResponse()
    }

    @Transactional
    fun delete(id: Long) {
        val book = getOrThrow(id)
        repository.delete(book)
    }

    private fun validateBusinessRules(request: BookRequest) {
        val available = request.copiesAvailable ?: 0
        val total = request.copiesTotal ?: 1
        if (available > total) {
            throw BusinessValidationException(
                field = "copiesAvailable",
                message = "A quantidade disponível ($available) não pode ser maior que o total de exemplares ($total).",
            )
        }
        val currentYear = Year.now().value
        val year = request.publicationYear ?: currentYear
        if (year > currentYear) {
            throw BusinessValidationException(
                field = "publicationYear",
                message = "O ano de publicação não pode ser superior ao ano atual ($currentYear).",
            )
        }
    }

    private fun getOrThrow(id: Long): Book =
        repository.findByIdOrNull(id)
            ?: throw ResourceNotFoundException("Livro com id $id não encontrado.")
}

