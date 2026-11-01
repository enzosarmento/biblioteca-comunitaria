package com.biblioteca.user

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

enum class Role { ADMIN, USER }

@Entity
@Table(name = "app_users")
class AppUser(
    @Column(nullable = false, unique = true, length = 60)
    var username: String,

    @Column(name = "password_hash", nullable = false, length = 100)
    var passwordHash: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var role: Role = Role.USER,

    @Column(nullable = false)
    var enabled: Boolean = true,

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
)

