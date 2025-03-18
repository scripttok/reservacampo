// src/screens/PriceTableScreen.js
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { priceService } from "../services/priceService";

export default function PriceTableScreen({ navigation }) {
  const [precoTurmas, setPrecoTurmas] = useState("");
  const [precoEscolinha, setPrecoEscolinha] = useState("");
  const [precoAvulso, setPrecoAvulso] = useState("");

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const prices = await priceService.getPrices();
        setPrecoTurmas(prices.turmas?.toString() || "");
        setPrecoEscolinha(prices.escolinha?.toString() || "");
        setPrecoAvulso(prices.avulso?.toString() || "");
      } catch (error) {
        console.error("PriceTableScreen: Erro ao carregar preços:", error);
      }
    };
    fetchPrices();
  }, []);

  const handleSavePrices = async () => {
    try {
      const prices = {
        turmas: parseFloat(precoTurmas) || 0,
        escolinha: parseFloat(precoEscolinha) || 0,
        avulso: parseFloat(precoAvulso) || 0,
      };
      await priceService.setPrices(prices);
      alert("Preços salvos com sucesso!");
      navigation.goBack();
    } catch (error) {
      console.error("PriceTableScreen: Erro ao salvar preços:", error);
      alert("Erro ao salvar os preços.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tabela de Preços</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Turmas (Mensal)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: 200.00"
          keyboardType="numeric"
          value={precoTurmas}
          onChangeText={setPrecoTurmas}
        />
        <Text style={styles.description}>
          Valor mensal cobrado das turmas cadastradas.
        </Text>

        <Text style={styles.label}>Escolinha (Mensal)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: 150.00"
          keyboardType="numeric"
          value={precoEscolinha}
          onChangeText={setPrecoEscolinha}
        />
        <Text style={styles.description}>
          Valor mensal cobrado dos alunos da escolinha.
        </Text>

        <Text style={styles.label}>Avulso (Por dia)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: 100.00"
          keyboardType="numeric"
          value={precoAvulso}
          onChangeText={setPrecoAvulso}
        />
        <Text style={styles.description}>
          Valor cobrado por reserva avulsa de 1 dia.
        </Text>

        <TouchableOpacity style={styles.saveButton} onPress={handleSavePrices}>
          <Text style={styles.saveButtonText}>Salvar Preços</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 15,
  },
  header: {
    marginTop: 30,
    backgroundColor: "#2ecc71",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  form: {
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
