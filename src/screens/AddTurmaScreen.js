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
import { db } from "../services/firebaseService";
import { collection, addDoc } from "firebase/firestore";
import moment from "moment";
import "moment/locale/pt-br"; // Importa o locale português

moment.locale("pt-br");

export default function AddTurmaScreen({ route, navigation }) {
  const {
    campoId,
    dia,
    inicio,
    fim,
    turma,
    mode,
    data,
    tipo: tipoParam,
  } = route.params || {};
  const [nome, setNome] = useState(turma?.nome || "");
  const [responsavel, setResponsavel] = useState(turma?.responsavel || "");
  const [telefone, setTelefone] = useState(turma?.telefone || "");
  const [turmaDia, setTurmaDia] = useState(
    data && moment(data).isValid()
      ? moment(data).format("dddd").toLowerCase().replace("-feira", "")
      : turma?.dia || dia || ""
  );
  const [turmaInicio, setTurmaInicio] = useState(turma?.inicio || inicio || "");
  const [turmaFim, setTurmaFim] = useState(turma?.fim || fim || "");
  const [tipo, setTipo] = useState(tipoParam || mode || "turmas");

  useEffect(() => {
    if (data && moment(data).isValid()) {
      console.log("AddTurmaScreen: Data recebida do Calendario:", data);
      setTurmaDia(
        moment(data).format("dddd").toLowerCase().replace("-feira", "")
      );
    } else if (dia && inicio && fim) {
      console.log("AddTurmaScreen: Preenchendo com horário disponível:", {
        dia,
        inicio,
        fim,
      });
      setTurmaDia(dia);
      setTurmaInicio(inicio);
      setTurmaFim(fim);
    }
  }, [dia, inicio, fim, data]);

  const salvarReservaNoFirestore = async (reserva) => {
    try {
      const reservasRef = collection(db, "reservas");
      const docRef = await addDoc(reservasRef, reserva);
      console.log("Reserva salva no Firestore com ID:", docRef.id, reserva);
      return docRef.id;
    } catch (error) {
      console.error("Erro ao salvar reserva no Firestore:", error);
      throw error;
    }
  };

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

    if (!campoId) {
      Alert.alert("Erro", "Nenhum campo selecionado para a reserva!");
      return;
    }

    const novaTurmaOuAula = {
      campoId: campoId,
      nome: nome,
      responsavel: responsavel,
      telefone: telefone,
      dia: turmaDia.toLowerCase(),
      inicio: turmaInicio,
      fim: turmaFim,
      createdAt: turma?.createdAt || new Date().toISOString(),
    };

    const turmasExistentes = await turmaService.getTurmas();
    const aulasExistentes = await escolinhaService.getAulas();
    const todosHorarios = [...turmasExistentes, ...aulasExistentes]
      .map((item) => ({
        ...item,
        dia: item.dia.toLowerCase(),
      }))
      .filter((item) => item.dia === novaTurmaOuAula.dia);

    const conflito = todosHorarios.some((item) => {
      if (turma && item.id === turma.id) return false;
      return checkHorarioConflito(item, novaTurmaOuAula);
    });

    if (conflito) {
      Alert.alert(
        "Conflito de Horário",
        "Este horário já está ocupado por outra turma ou aula!"
      );
      return;
    }

    try {
      if (data && moment(data).isValid()) {
        const reserva = {
          data: moment(data).format("YYYY-MM-DD"),
          horarioInicio: turmaInicio,
          horarioFim: turmaFim,
          nome: nome,
          tipo: "mensal", // Alterado para "mensal"
          campoId: campoId,
          responsavel: responsavel,
          telefone: telefone,
        };
        await salvarReservaNoFirestore(reserva);
        console.log("AddTurmaScreen: Reserva mensal salva com sucesso");
      } else if (tipo === "turmas") {
        if (turma?.id) {
          await turmaService.updateTurma(turma.id, novaTurmaOuAula);
        } else {
          await turmaService.addTurma(novaTurmaOuAula);
        }
      } else {
        if (turma?.id) {
          await escolinhaService.updateAula(turma.id, novaTurmaOuAula);
        } else {
          await escolinhaService.addAula(novaTurmaOuAula);
        }
      }
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      Alert.alert("Erro", "Erro ao salvar a reserva/turma/aula.");
      return;
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
