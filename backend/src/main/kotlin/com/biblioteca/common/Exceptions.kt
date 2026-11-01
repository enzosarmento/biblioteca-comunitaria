package com.biblioteca.common

class ResourceNotFoundException(message: String) : RuntimeException(message)

class ConflictException(message: String) : RuntimeException(message)

class BusinessValidationException(
    val field: String,
    override val message: String,
) : RuntimeException(message)

