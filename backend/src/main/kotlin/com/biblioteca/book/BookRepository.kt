package com.biblioteca.book

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface BookRepository : JpaRepository<Book, Long> {
    fun existsByIsbnIgnoreCase(isbn: String): Boolean
    fun existsByIsbnIgnoreCaseAndIdNot(isbn: String, id: Long): Boolean

    @Query(
        """
        select b from Book b
        where lower(b.title) like lower(concat('%', :q, '%'))
           or lower(b.author) like lower(concat('%', :q, '%'))
           or lower(b.isbn) like lower(concat('%', :q, '%'))
        order by b.title
        """,
    )
    fun search(@Param("q") q: String): List<Book>
}

