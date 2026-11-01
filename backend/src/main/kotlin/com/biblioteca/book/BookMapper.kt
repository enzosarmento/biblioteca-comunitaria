package com.biblioteca.book

import com.biblioteca.book.dto.BookRequest
import com.biblioteca.book.dto.BookResponse

fun BookRequest.toEntity(): Book = Book(
    title = title.trim(),
    author = author.trim(),
    isbn = isbn.trim().uppercase(),
    publisher = publisher.trim(),
    publicationYear = publicationYear!!,
    genre = genre!!,
    copiesTotal = copiesTotal!!,
    copiesAvailable = copiesAvailable!!,
    location = location.trim(),
    acquisitionDate = acquisitionDate,
    synopsis = synopsis?.trim()?.ifBlank { null },
    active = active,
)

fun Book.applyChanges(request: BookRequest) {
    title = request.title.trim()
    author = request.author.trim()
    isbn = request.isbn.trim().uppercase()
    publisher = request.publisher.trim()
    publicationYear = request.publicationYear!!
    genre = request.genre!!
    copiesTotal = request.copiesTotal!!
    copiesAvailable = request.copiesAvailable!!
    location = request.location.trim()
    acquisitionDate = request.acquisitionDate
    synopsis = request.synopsis?.trim()?.ifBlank { null }
    active = request.active
}

fun Book.toResponse(): BookResponse = BookResponse(
    id = id!!,
    title = title,
    author = author,
    isbn = isbn,
    publisher = publisher,
    publicationYear = publicationYear,
    genre = genre,
    copiesTotal = copiesTotal,
    copiesAvailable = copiesAvailable,
    location = location,
    acquisitionDate = acquisitionDate,
    synopsis = synopsis,
    active = active,
    available = active && copiesAvailable > 0,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

