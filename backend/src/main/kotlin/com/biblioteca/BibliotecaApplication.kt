package com.biblioteca

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class BibliotecaApplication

fun main(args: Array<String>) {
    runApplication<BibliotecaApplication>(*args)
}

