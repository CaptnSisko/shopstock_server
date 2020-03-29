-- MySQL dump 10.16  Distrib 10.1.44-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: shopstock
-- ------------------------------------------------------
-- Server version	10.1.44-MariaDB-0ubuntu0.18.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `chain_lookup`
--

DROP TABLE IF EXISTS `chain_lookup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chain_lookup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chain_lookup`
--

LOCK TABLES `chain_lookup` WRITE;
/*!40000 ALTER TABLE `chain_lookup` DISABLE KEYS */;
INSERT INTO `chain_lookup` VALUES (1,'Catagory name 1'),(2,'Catagory name 2');
/*!40000 ALTER TABLE `chain_lookup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_category_lookup`
--

DROP TABLE IF EXISTS `item_category_lookup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_category_lookup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_category_lookup`
--

LOCK TABLES `item_category_lookup` WRITE;
/*!40000 ALTER TABLE `item_category_lookup` DISABLE KEYS */;
INSERT INTO `item_category_lookup` VALUES (1,'item category name 1'),(2,'item category name 2');
/*!40000 ALTER TABLE `item_category_lookup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_lookup`
--

DROP TABLE IF EXISTS `item_lookup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_lookup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `category` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_lookup`
--

LOCK TABLES `item_lookup` WRITE;
/*!40000 ALTER TABLE `item_lookup` DISABLE KEYS */;
INSERT INTO `item_lookup` VALUES (1,'Milk',1),(2,'Potatos',2);
/*!40000 ALTER TABLE `item_lookup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_category_lookup`
--

DROP TABLE IF EXISTS `store_category_lookup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `store_category_lookup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `item_category_ids` varchar(256) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_category_lookup`
--

LOCK TABLES `store_category_lookup` WRITE;
/*!40000 ALTER TABLE `store_category_lookup` DISABLE KEYS */;
INSERT INTO `store_category_lookup` VALUES (1,'Grocery','2'),(2,'Department','1,2');
/*!40000 ALTER TABLE `store_category_lookup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_lookup`
--

DROP TABLE IF EXISTS `store_lookup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `store_lookup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `address` varchar(256) NOT NULL,
  `gps_lat` decimal(10,8) NOT NULL,
  `gps_long` decimal(11,8) NOT NULL,
  `category_id` int(11) NOT NULL,
  `chain_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_lookup`
--

LOCK TABLES `store_lookup` WRITE;
/*!40000 ALTER TABLE `store_lookup` DISABLE KEYS */;
INSERT INTO `store_lookup` VALUES (1,'100% legit store name','totally a store address',-20.20000000,20.20000000,1,1),(2,'500% legit store name','totally another store address',20.20000000,-20.20000000,1,1);
/*!40000 ALTER TABLE `store_lookup` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2020-03-29 17:31:19
