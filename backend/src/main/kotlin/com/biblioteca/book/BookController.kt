package com.biblioteca.book

import com.biblioteca.book.dto.BookRequest
import com.biblioteca.book.dto.BookResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.support.ServletUriComponentsBuilder

@RestController
@RequestMapping("/api/books")
class BookController(private val service: BookService) {

    @GetMapping
    fun list(@RequestParam(required = false) q: String?): List<BookResponse> =
        service.findAll(q)

    @GetMapping("/{id}")
    fun get(@PathVariable id: Long): BookResponse =
        service.findById(id)

    @PostMapping
    fun create(@Valid @RequestBody request: BookRequest): ResponseEntity<BookResponse> {
        val created = service.create(request)
        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created.id)
            .toUri()
        return ResponseEntity.created(location).body(created)
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @Valid @RequestBody request: BookRequest): BookResponse =
        service.update(id, request)

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: Long) =
        service.delete(id)
}

