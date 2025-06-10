-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 07-06-2025 a las 20:28:30
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `crud-biblioteca`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `authors`
--

CREATE TABLE `authors` (
  `id_author` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `state` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish2_ci;

--
-- Volcado de datos para la tabla `authors`
--

INSERT INTO `authors` (`id_author`, `name`, `state`, `created_at`) VALUES
(1, 'Gabriel García Márquez', 1, '2025-06-06 23:05:34'),
(2, 'J.K. Rowling', 1, '2025-06-06 23:05:34'),
(3, 'George Orwell', 1, '2025-06-06 23:05:34'),
(4, 'Isabel Allende', 1, '2025-06-06 23:05:34'),
(5, 'Ernest Hemingway', 1, '2025-06-06 23:05:34'),
(6, 'F. Scott Fitzgerald', 1, '2025-06-06 23:05:34'),
(7, 'Haruki Murakami', 1, '2025-06-06 23:05:34'),
(8, 'Jane Austen', 1, '2025-06-06 23:05:34'),
(9, 'Leo Tolstoy', 1, '2025-06-06 23:05:34'),
(10, 'Mark Twain', 1, '2025-06-06 23:05:34');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `books`
--

CREATE TABLE `books` (
  `id_book` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `isbn` varchar(13) DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `id_author` int(11) NOT NULL,
  `id_category` int(11) NOT NULL,
  `id_editorial` int(11) NOT NULL,
  `state` tinyint(1) DEFAULT 1,
  `is_deleted` tinyint(1) DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `available` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish2_ci;

--
-- Volcado de datos para la tabla `books`
--

INSERT INTO `books` (`id_book`, `title`, `isbn`, `year`, `id_author`, `id_category`, `id_editorial`, `state`, `is_deleted`, `deleted_at`, `created_at`, `available`) VALUES
(1, 'Cien años de soledad', '978-3-16-1484', 1967, 1, 1, 1, 1, 0, NULL, '2025-06-06 23:06:48', 5),
(2, 'Harry Potter y la piedra filosofal', '978-0-7475-32', 1997, 2, 2, 2, 1, 0, NULL, '2025-06-06 23:06:48', 3),
(3, '1984', '978-0-452-284', 1949, 3, 3, 1, 1, 0, NULL, '2025-06-06 23:06:48', 3),
(4, 'La casa de los espíritus', '978-0-06-0732', 1982, 4, 1, 1, 1, 0, NULL, '2025-06-06 23:06:48', 1),
(5, 'El viejo y el mar', '978-0-684-801', 1952, 5, 1, 1, 1, 0, NULL, '2025-06-06 23:06:48', 6),
(6, 'El gran Gatsby', '978-0-7432-73', 1925, 6, 1, 1, 1, 0, NULL, '2025-06-06 23:06:48', 4),
(7, 'Kafka en la orilla', '978-0-06-1120', 2002, 7, 1, 1, 1, 0, NULL, '2025-06-06 23:06:48', 3),
(8, 'Orgullo y prejuicio', '978-0-19-9535', 1813, 8, 1, 1, 1, 0, NULL, '2025-06-06 23:06:48', 5),
(9, 'Guerra y paz', '978-0-14-3039', 1869, 9, 1, 1, 1, 0, NULL, '2025-06-06 23:06:48', 2),
(10, 'Las aventuras de Tom Sawyer', '978-0-14-2437', 1876, 10, 1, 1, 1, 0, NULL, '2025-06-06 23:06:48', 4);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categories`
--

CREATE TABLE `categories` (
  `id_category` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `state` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish2_ci;

--
-- Volcado de datos para la tabla `categories`
--

INSERT INTO `categories` (`id_category`, `name`, `state`, `created_at`, `description`) VALUES
(1, 'Ficción', 1, '2025-06-06 23:06:20', 'Narraciones creadas a partir de la imaginación del autor.'),
(2, 'Fantasía', 1, '2025-06-06 23:06:20', 'Literatura que incluye elementos mágicos o sobrenaturales.'),
(3, 'Ciencia ficción', 1, '2025-06-06 23:06:20', 'Literatura que explora avances científicos y tecnológicos imaginarios.'),
(4, 'No ficción', 1, '2025-06-06 23:06:20', 'Obras basadas en hechos reales o investigaciones.'),
(5, 'Clásicos', 1, '2025-06-06 23:06:20', 'Obras literarias reconocidas y de gran relevancia histórica.');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `editorials`
--

CREATE TABLE `editorials` (
  `id_editorial` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `state` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish2_ci;

--
-- Volcado de datos para la tabla `editorials`
--

INSERT INTO `editorials` (`id_editorial`, `name`, `state`, `created_at`, `description`) VALUES
(1, 'Penguin Random House', 1, '2025-06-06 23:05:59', 'Una de las editoriales más grandes del mundo.'),
(2, 'HarperCollins', 1, '2025-06-06 23:05:59', 'Editorial global con una rica historia de publicar autores icónicos.'),
(3, 'Planeta', 1, '2025-06-06 23:05:59', 'Editorial española con gran presencia en América Latina.'),
(4, 'Ediciones Siruela', 1, '2025-06-06 23:05:59', 'Publica obras clásicas y contemporáneas de literatura.'),
(5, 'Editorial Norma', 1, '2025-06-06 23:05:59', 'Editorial colombiana que publica literatura infantil y juvenil.');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `loans`
--

CREATE TABLE `loans` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `loan_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `due_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `return_date` timestamp NULL DEFAULT NULL,
  `status` enum('active','returned','overdue') NOT NULL DEFAULT 'active',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish2_ci;

--
-- Volcado de datos para la tabla `loans`
--

INSERT INTO `loans` (`id`, `user_id`, `book_id`, `loan_date`, `due_date`, `return_date`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(24, 11, 3, '2025-06-07 00:14:30', '2025-06-17 05:00:00', NULL, 'active', 4, '2025-06-07 00:14:30', NULL),
(25, 11, 4, '2025-06-07 00:36:26', '2025-06-18 05:00:00', NULL, 'active', 4, '2025-06-07 00:36:26', NULL),
(26, 15, 8, '2025-06-07 01:25:57', '2025-06-19 05:00:00', '2025-06-07 01:26:09', 'returned', 4, '2025-06-07 01:25:57', '2025-06-07 01:26:09');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish2_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'admin', 'Administrador del sistema con acceso total', '2025-05-28 14:10:46'),
(2, 'librarian', 'Bibliotecario con acceso a gestión de libros y préstamos', '2025-05-28 14:10:46'),
(3, 'user', 'Usuario regular que puede realizar préstamos', '2025-05-28 14:10:46');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish2_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `email`, `role_id`, `created_at`, `updated_at`, `status`) VALUES
(1, 'Administrador', '$2b$10$3vS0S3lYVaRFBxMbiaYtSeU1W4Gk29/TmS0o5.8choh5P2rQ/CO0i', 'Eliseo Vega', 'admin@biblioapp.com', 1, '2025-05-28 14:17:08', NULL, 1),
(4, 'Bibliotecario', '$2b$10$tBpEfzaz.O7DsZ6.3qZsFePbO6Uz68Fa2wutr/wTLGXPM.Xm/7VNS', 'Alejandro Cossi', 'alejandro25fp@gmail.com', 2, '2025-05-28 15:38:53', '2025-06-06 18:28:11', 1),
(11, 'Usuario', '$2b$10$7sSHA/E5htSInKMw3itLpOEVsNf8KdjAvJ7rNGhSR6ifUMYqzAZkC', 'Alejandro Jose', 'usuario@gmail.com', 3, '2025-05-28 23:04:29', '2025-06-06 17:01:52', 1),
(15, 'Usuario-1', '$2b$10$7sSHA/E5htSInKMw3itLpOEVsNf8KdjAvJ7rNGhSR6ifUMYqzAZkC', 'Eliseo vega', 'eliseovega@gmail.com', 3, '2025-05-28 23:04:29', '2025-06-06 17:01:52', 1);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `authors`
--
ALTER TABLE `authors`
  ADD PRIMARY KEY (`id_author`);

--
-- Indices de la tabla `books`
--
ALTER TABLE `books`
  ADD PRIMARY KEY (`id_book`),
  ADD KEY `id_author` (`id_author`),
  ADD KEY `id_category` (`id_category`),
  ADD KEY `id_editorial` (`id_editorial`);

--
-- Indices de la tabla `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id_category`);

--
-- Indices de la tabla `editorials`
--
ALTER TABLE `editorials`
  ADD PRIMARY KEY (`id_editorial`);

--
-- Indices de la tabla `loans`
--
ALTER TABLE `loans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `book_id` (`book_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `authors`
--
ALTER TABLE `authors`
  MODIFY `id_author` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `books`
--
ALTER TABLE `books`
  MODIFY `id_book` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `categories`
--
ALTER TABLE `categories`
  MODIFY `id_category` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `editorials`
--
ALTER TABLE `editorials`
  MODIFY `id_editorial` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `loans`
--
ALTER TABLE `loans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `books`
--
ALTER TABLE `books`
  ADD CONSTRAINT `books_ibfk_1` FOREIGN KEY (`id_author`) REFERENCES `authors` (`id_author`),
  ADD CONSTRAINT `books_ibfk_2` FOREIGN KEY (`id_category`) REFERENCES `categories` (`id_category`),
  ADD CONSTRAINT `books_ibfk_3` FOREIGN KEY (`id_editorial`) REFERENCES `editorials` (`id_editorial`);

--
-- Filtros para la tabla `loans`
--
ALTER TABLE `loans`
  ADD CONSTRAINT `loans_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `loans_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id_book`),
  ADD CONSTRAINT `loans_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Filtros para la tabla `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
