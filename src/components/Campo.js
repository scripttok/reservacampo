// src/components/Campo.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function Campo({ campo, proximoHorario, onPress, onLongPress }) {
  return (
    <TouchableOpacity
      style={styles.campoContainer}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <View style={styles.campo}>
        {/* Linha do meio */}
        <View style={styles.linhaMeio} />
        {/* Círculo central */}
        <View style={styles.circuloCentral} />
        {/* Áreas grandes */}
        <View style={styles.areaGrandeEsq} />
        <View style={styles.areaGrandeDir} />
        {/* Áreas pequenas */}
        <View style={styles.areaPequenaEsq} />
        <View style={styles.areaPequenaDir} />
        {/* Nome do campo */}
        <Text style={styles.campoNome}>{campo.nome}</Text>
        {/* Próximo horário (se aplicável) */}
        {proximoHorario && (
          <Text style={styles.proximoHorario}>{proximoHorario}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  campoContainer: {
    width: 300, // Reduzido para caber em telas móveis (ajuste conforme necessário)
    height: 200, // Proporção mantida
    backgroundColor: "#2ecc71", // Verde do gramado
    borderWidth: 2,
    borderColor: "white",
    position: "relative",
    overflow: "hidden",
    borderRadius: 10,
    marginVertical: 10,
  },
  campo: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  linhaMeio: {
    width: 2,
    height: "100%",
    backgroundColor: "white",
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -1 }], // Ajuste fino para centralizar
  },
  circuloCentral: {
    width: 40, // Reduzido proporcionalmente
    height: 40,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 20,
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: "transparent",
  },
  areaGrandeEsq: {
    width: 60, // Reduzido proporcionalmente
    height: 100,
    borderWidth: 2,
    borderColor: "white",
    position: "absolute",
    left: 0,
    top: "50%",
    transform: [{ translateY: -50 }],
    backgroundColor: "transparent",
  },
  areaGrandeDir: {
    width: 60,
    height: 100,
    borderWidth: 2,
    borderColor: "white",
    position: "absolute",
    right: 0,
    top: "50%",
    transform: [{ translateY: -50 }],
    backgroundColor: "transparent",
  },
  areaPequenaEsq: {
    width: 20, // Reduzido proporcionalmente
    height: 60,
    borderWidth: 2,
    borderColor: "white",
    position: "absolute",
    left: 0,
    top: "50%",
    transform: [{ translateY: -30 }],
    backgroundColor: "transparent",
  },
  areaPequenaDir: {
    width: 20,
    height: 60,
    borderWidth: 2,
    borderColor: "white",
    position: "absolute",
    right: 0,
    top: "50%",
    transform: [{ translateY: -30 }],
    backgroundColor: "transparent",
  },
  campoNome: {
    position: "absolute",
    top: 10,
    left: 10,
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  proximoHorario: {
    position: "absolute",
    bottom: 10,
    right: 10,
    fontSize: 14,
    color: "white",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
