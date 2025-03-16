// src/screens/AddTurmaScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { turmaService } from "../services/turmaService";
import { escolinhaService } from "../services/escolinhaService";
import { checkHorarioConflito } from "../utils/horarioUtils";

export default function AddTurmaScreen({ route, navigation }) {
  const { campoId, dia, inicio, fim, turma, mode } = route.params || {};
  const [nome, setNome] = useState(turma?.nome || "");
  const [responsavel, setResponsavel] = useState(turma?.responsavel || "");
  const [telefone, setTelefone] = useState(turma?.telefone || "");
  const [turmaDia, setTurmaDia] = useState(turma?.dia || dia || "");
  const [turmaInicio, setTurmaInicio] = useState(turma?.inicio || inicio || "");
  const [turmaFim, setTurmaFim] = useState(turma?.fim || fim || "");
  const [tipo, setTipo] = useState(mode || "turmas");

  useEffect(() => {
    if (dia && inicio && fim) {
      console.log("AddTurmaScreen: Preenchendo com horário disponível:", {
        dia,
        inicio,
        fim,
      });
      setTurmaDia(dia);
      setTurmaInicio(inicio);
      setTurmaFim(fim);
    }
  }, [dia, inicio, fim]);

  const handleSave = async () => {
    if (
      !nome ||
      !responsavel ||
      !telefone ||
      !turmaDia ||
      !turmaInicio ||
      !turmaFim
    ) {
      Alert.alert("Erro", "Preencha todos os campos!");
      return;
    }

    const novaTurmaOuAula = {
      campoId,
      nome,
      responsavel,
      telefone,
      dia: turmaDia.toLowerCase(),
      inicio: turmaInicio,
      fim: turmaFim,
      createdAt: turma?.createdAt || new Date().toISOString(),
    };

    console.log("AddTurmaScreen: Tentando salvar:", novaTurmaOuAula);

    // Buscar turmas e aulas existentes
    const turmasExistentes = await turmaService.getTurmas();
    const aulasExistentes = await escolinhaService.getAulas();
    const todosHorarios = [...turmasExistentes, ...aulasExistentes]
      .map((item) => ({
        ...item,
        dia: item.dia.toLowerCase(),
      }))
      .filter((item) => {
        const matchesDay = item.dia === novaTurmaOuAula.dia;
        if (!matchesDay) {
          console.log("Item filtrado (dia diferente):", item);
        }
        return matchesDay;
      });

    console.log(
      "AddTurmaScreen: Horários filtrados para o dia",
      novaTurmaOuAula.dia,
      ":",
      todosHorarios
    );

    // Verificar conflitos apenas no mesmo dia
    const conflito = todosHorarios.some((item) => {
      if (turma && item.id === turma.id) return false; // Ignorar a própria turma/aula ao editar
      const conflitoDetectado = checkHorarioConflito(item, novaTurmaOuAula);
      if (conflitoDetectado) {
        console.log("Conflito encontrado com:", item);
      }
      return conflitoDetectado;
    });

    if (conflito) {
      Alert.alert(
        "Conflito de Horário",
        "Este horário já está ocupado por outra turma ou aula!"
      );
      return;
    }

    try {
      if (tipo === "turmas") {
        if (turma?.id) {
          await turmaService.updateTurma(turma.id, novaTurmaOuAula);
          console.log("Turma atualizada com sucesso");
        } else {
          await turmaService.addTurma(novaTurmaOuAula);
          console.log("Turma adicionada com sucesso");
        }
      } else {
        if (turma?.id) {
          await escolinhaService.updateAula(turma.id, novaTurmaOuAula);
          console.log("Aula atualizada com sucesso");
        } else {
          await escolinhaService.addAula(novaTurmaOuAula);
          console.log("Aula adicionada com sucesso");
        }
      }
      navigation.goBack();
    } catch (error) {
      console.error(
        `Erro ao salvar ${tipo === "turmas" ? "turma" : "aula"}:`,
        error
      );
      Alert.alert(
        "Erro",
        `Erro ao salvar a ${tipo === "turmas" ? "turma" : "aula"}.`
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {turma ? "Editar" : "Adicionar"} {tipo === "turmas" ? "Turma" : "Aula"}
      </Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            tipo === "turmas" && styles.toggleButtonActive,
          ]}
          onPress={() => setTipo("turmas")}
        >
          <Text style={styles.toggleText}>Turma</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            tipo === "escolinha" && styles.toggleButtonActive,
          ]}
          onPress={() => setTipo("escolinha")}
        >
          <Text style={styles.toggleText}>Escolinha</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder={`Nome da ${tipo === "turmas" ? "turma" : "aula"}`}
        value={nome}
        onChangeText={setNome}
      />
      <TextInput
        style={styles.input}
        placeholder="Responsável"
        value={responsavel}
        onChangeText={setResponsavel}
      />
      <TextInput
        style={styles.input}
        placeholder="Telefone"
        value={telefone}
        onChangeText={setTelefone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Dia (ex.: segunda)"
        value={turmaDia}
        onChangeText={setTurmaDia}
      />
      <TextInput
        style={styles.input}
        placeholder="Início (ex.: 08:00)"
        value={turmaInicio}
        onChangeText={setTurmaInicio}
      />
      <TextInput
        style={styles.input}
        placeholder="Fim (ex.: 09:30)"
        value={turmaFim}
        onChangeText={setTurmaFim}
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
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#ddd",
    borderRadius: 5,
    marginHorizontal: 5,
  },
  toggleButtonActive: {
    backgroundColor: "#007AFF",
  },
  toggleText: {
    color: "#fff",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#007AFF",
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
