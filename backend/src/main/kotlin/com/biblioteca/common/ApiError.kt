package com.biblioteca.common

import java.time.Instant

data class FieldErrorDetail(
    val field: String,
    val message: String,
)

data class ApiError(
    val timestamp: Instant = Instant.now(),
    val status: Int,
    val code: String,
    val message: String,
    val path: String,
    val fieldErrors: List<FieldErrorDetail> = emptyList(),
)

