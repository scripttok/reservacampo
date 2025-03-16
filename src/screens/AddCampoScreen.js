// src/screens/AddCampoScreen.js
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { campoService } from "../services/campoService";

export default function AddCampoScreen({ navigation, route }) {
  const { campo, refreshCampos } = route.params || {};
  const [nome, setNome] = useState(campo ? campo.nome : "");

  useEffect(() => {
    if (campo) setNome(campo.nome);
  }, [campo]);

  const handleSave = async () => {
    if (!nome.trim()) {
      alert("Por favor, insira o nome do campo.");
      return;
    }
    try {
      if (campo) {
        await campoService.updateCampo(campo.id, nome);
      } else {
        await campoService.addCampo(nome);
      }
      if (refreshCampos) await refreshCampos();
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao salvar campo:", error);
      alert("Erro ao salvar o campo.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nome do Campo</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Digite o nome do campo"
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Salvar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
