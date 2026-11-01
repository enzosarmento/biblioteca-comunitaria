package com.biblioteca.config

import com.biblioteca.book.Book
import com.biblioteca.book.BookGenre
import com.biblioteca.book.BookRepository
import com.biblioteca.user.AppUser
import com.biblioteca.user.AppUserRepository
import com.biblioteca.user.Role
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Component
class DataInitializer(
    private val users: AppUserRepository,
    private val books: BookRepository,
    private val encoder: PasswordEncoder,
    @Value("\${app.seed.admin-username}") private val adminUsername: String,
    @Value("\${app.seed.admin-password}") private val adminPassword: String,
    @Value("\${app.seed.sample-data}") private val sampleData: Boolean,
) : ApplicationRunner {

    @Transactional
    override fun run(args: ApplicationArguments) {
        if (!users.existsByUsername(adminUsername)) {
            users.save(
                AppUser(
                    username = adminUsername,
                    passwordHash = encoder.encode(adminPassword)!!,
                    role = Role.ADMIN,
                ),
            )
        }

        if (sampleData && books.count() == 0L) {
            books.saveAll(
                listOf(
                    Book(
                        title = "Dom Casmurro",
                        author = "Machado de Assis",
                        isbn = "978-85-359-0277-8",
                        publisher = "Companhia das Letras",
                        publicationYear = 1899,
                        genre = BookGenre.ROMANCE,
                        copiesTotal = 5,
                        copiesAvailable = 3,
                        location = "Corredor A - Estante 1",
                        acquisitionDate = LocalDate.of(2024, 3, 15),
                        synopsis = "Clássico da literatura brasileira narrado por Bentinho, que revisita sua juventude ao lado de Capitu e Escobar.",
                    ),
                    Book(
                        title = "Quarto de Despejo: Diário de uma Favelada",
                        author = "Carolina Maria de Jesus",
                        isbn = "978-85-08-17127-9",
                        publisher = "Ática",
                        publicationYear = 1960,
                        genre = BookGenre.BIOGRAFIA,
                        copiesTotal = 4,
                        copiesAvailable = 0,
                        location = "Corredor A - Estante 2",
                        acquisitionDate = LocalDate.of(2024, 5, 20),
                        synopsis = "Relato documental do cotidiano na favela do Canindé, em São Paulo, escrito entre 1955 e 1960.",
                    ),
                    Book(
                        title = "Vidas Secas",
                        author = "Graciliano Ramos",
                        isbn = "978-85-01-01207-4",
                        publisher = "Record",
                        publicationYear = 1938,
                        genre = BookGenre.ROMANCE,
                        copiesTotal = 6,
                        copiesAvailable = 4,
                        location = "Corredor A - Estante 1",
                        acquisitionDate = LocalDate.of(2023, 11, 10),
                        synopsis = "A trajetória da família de retirantes sertanejos formada por Fabiano, Sinhá Vitória, os dois filhos e a cadela Baleia.",
                    ),
                    Book(
                        title = "A Hora da Estrela",
                        author = "Clarice Lispector",
                        isbn = "978-85-325-3078-3",
                        publisher = "Rocco",
                        publicationYear = 1977,
                        genre = BookGenre.ROMANCE,
                        copiesTotal = 3,
                        copiesAvailable = 2,
                        location = "Corredor A - Estante 3",
                        acquisitionDate = LocalDate.of(2025, 2, 8),
                        synopsis = "Narrativa sobre Macabéa, jovem alagoana datilógrafa no Rio de Janeiro, contada pelo narrador Rodrigo S.M.",
                    ),
                    Book(
                        title = "Capitães da Areia",
                        author = "Jorge Amado",
                        isbn = "978-85-359-1406-1",
                        publisher = "Companhia das Letras",
                        publicationYear = 1937,
                        genre = BookGenre.ROMANCE,
                        copiesTotal = 4,
                        copiesAvailable = 1,
                        location = "Corredor B - Estante 1",
                        acquisitionDate = LocalDate.of(2024, 8, 12),
                        synopsis = "História do grupo de meninos em situação de rua liderado por Pedro Bala num trapiche abandonado de Salvador.",
                    ),
                    Book(
                        title = "Meu Pé de Laranja Lima",
                        author = "José Mauro de Vasconcelos",
                        isbn = "978-85-06-08543-1",
                        publisher = "Melhoramentos",
                        publicationYear = 1968,
                        genre = BookGenre.INFANTIL,
                        copiesTotal = 5,
                        copiesAvailable = 5,
                        location = "Corredor C - Estante Infantil 1",
                        acquisitionDate = LocalDate.of(2025, 1, 25),
                        synopsis = "A infância sensível e imaginativa de Zezé, um menino de cinco anos que encontra amizade em um pequeno pé de laranja lima.",
                    ),
                    Book(
                        title = "Torto Arado",
                        author = "Itamar Vieira Junior",
                        isbn = "978-65-80309-31-3",
                        publisher = "Todavia",
                        publicationYear = 2019,
                        genre = BookGenre.ROMANCE,
                        copiesTotal = 3,
                        copiesAvailable = 0,
                        location = "Corredor B - Estante 2",
                        acquisitionDate = LocalDate.of(2025, 6, 14),
                        synopsis = "As irmãs Bibiana e Belonísia têm suas vidas marcadas por um acidente na infância no sertão da Chapada Diamantina.",
                    ),
                    Book(
                        title = "Alguma Poesia",
                        author = "Carlos Drummond de Andrade",
                        isbn = "978-85-359-2279-0",
                        publisher = "Companhia das Letras",
                        publicationYear = 1930,
                        genre = BookGenre.POESIA,
                        copiesTotal = 2,
                        copiesAvailable = 2,
                        location = "Corredor B - Estante 4",
                        acquisitionDate = LocalDate.of(2024, 9, 3),
                        synopsis = "Obra inaugural de Drummond no modernismo brasileiro, reunindo poemas emblemáticos como No Meio do Caminho.",
                    ),
                    Book(
                        title = "Raízes do Brasil",
                        author = "Sérgio Buarque de Holanda",
                        isbn = "978-85-359-2548-7",
                        publisher = "Companhia das Letras",
                        publicationYear = 1936,
                        genre = BookGenre.HISTORIA,
                        copiesTotal = 3,
                        copiesAvailable = 2,
                        location = "Corredor D - Estante História 1",
                        acquisitionDate = LocalDate.of(2024, 4, 19),
                        synopsis = "Ensaio clássico de interpretação histórica e sociológica sobre a formação da sociedade brasileira.",
                    ),
                    Book(
                        title = "Entendendo Algoritmos",
                        author = "Aditya Y. Bhargava",
                        isbn = "978-85-7522-563-9",
                        publisher = "Novatec",
                        publicationYear = 2017,
                        genre = BookGenre.TECNICO,
                        copiesTotal = 3,
                        copiesAvailable = 1,
                        location = "Corredor E - Estante Técnica 1",
                        acquisitionDate = LocalDate.of(2025, 3, 11),
                        synopsis = "Guia ilustrado e acessível sobre estruturas de dados, busca binária, grafos e programação dinâmica.",
                    ),
                ),
            )
        }
    }
}

