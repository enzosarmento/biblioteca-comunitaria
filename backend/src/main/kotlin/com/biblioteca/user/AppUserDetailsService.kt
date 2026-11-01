package com.biblioteca.user

import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class AppUserDetailsService(private val users: AppUserRepository) : UserDetailsService {
    override fun loadUserByUsername(username: String): UserDetails {
        val user = users.findByUsername(username)
            ?: throw UsernameNotFoundException("Usuário não encontrado")
        return User.withUsername(user.username)
            .password(user.passwordHash)
            .roles(user.role.name)
            .disabled(!user.enabled)
            .build()
    }
}

