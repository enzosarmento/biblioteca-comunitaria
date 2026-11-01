package com.biblioteca.book

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.Instant
import java.time.LocalDate

enum class BookGenre {
    ROMANCE,
    FICCAO_CIENTIFICA,
    FANTASIA,
    INFANTIL,
    BIOGRAFIA,
    HISTORIA,
    DIDATICO,
    POESIA,
    TECNICO,
    OUTROS,
}

@Entity
@Table(
    name = "books",
    uniqueConstraints = [UniqueConstraint(name = "uk_books_isbn", columnNames = ["isbn"])],
)
class Book(
    @Column(nullable = false, length = 150)
    var title: String,

    @Column(nullable = false, length = 120)
    var author: String,

    @Column(nullable = false, length = 20)
    var isbn: String,

    @Column(nullable = false, length = 100)
    var publisher: String,

    @Column(name = "publication_year", nullable = false)
    var publicationYear: Int,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    var genre: BookGenre,

    @Column(name = "copies_total", nullable = false)
    var copiesTotal: Int,

    @Column(name = "copies_available", nullable = false)
    var copiesAvailable: Int,

    @Column(nullable = false, length = 60)
    var location: String,

    @Column(name = "acquisition_date")
    var acquisitionDate: LocalDate? = null,

    @Column(length = 1000)
    var synopsis: String? = null,

    @Column(nullable = false)
    var active: Boolean = true,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
) {
    @PreUpdate
    fun touch() {
        updatedAt = Instant.now()
    }
}

