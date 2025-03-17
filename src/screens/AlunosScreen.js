// src/screens/AlunosScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { alunoService } from "../services/alunoService"; // Vamos criar esse serviço depois

export default function AlunosScreen({ navigation }) {
  const [alunos, setAlunos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [telefoneResponsavel, setTelefoneResponsavel] = useState("");
  const [idade, setIdade] = useState("");
  const [turma, setTurma] = useState("");

  // Carregar lista de alunos ao montar a tela
  useEffect(() => {
    const fetchAlunos = async () => {
      try {
        const alunosData = await alunoService.getAlunos();
        setAlunos(alunosData);
      } catch (error) {
        console.error("Erro ao carregar alunos:", error);
        Alert.alert("Erro", "Não foi possível carregar a lista de alunos.");
      }
    };
    fetchAlunos();
  }, []);

  // Abrir modal para adicionar aluno
  const handleAddAluno = () => {
    setEditMode(false);
    setAlunoSelecionado(null);
    setNome("");
    setResponsavel("");
    setTelefoneResponsavel("");
    setIdade("");
    setTurma("");
    setModalVisible(true);
  };

  // Salvar ou atualizar aluno
  const handleSaveAluno = async () => {
    if (
      !nome.trim() ||
      !responsavel.trim() ||
      !telefoneResponsavel.trim() ||
      !idade.trim() ||
      !turma.trim()
    ) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }

    try {
      if (editMode && alunoSelecionado) {
        await alunoService.updateAluno(alunoSelecionado.id, {
          nome,
          responsavel,
          telefoneResponsavel,
          idade: parseInt(idade),
          turma,
        });
      } else {
        await alunoService.addAluno({
          nome,
          responsavel,
          telefoneResponsavel,
          idade: parseInt(idade),
          turma,
        });
      }
      const alunosData = await alunoService.getAlunos();
      setAlunos(alunosData);
      setModalVisible(false);
    } catch (error) {
      console.error("Erro ao salvar aluno:", error);
      Alert.alert("Erro", "Não foi possível salvar o aluno.");
    }
  };

  // Abrir modal para editar aluno
  const handleEditAluno = (aluno) => {
    setEditMode(true);
    setAlunoSelecionado(aluno);
    setNome(aluno.nome);
    setResponsavel(aluno.responsavel);
    setTelefoneResponsavel(aluno.telefoneResponsavel);
    setIdade(aluno.idade.toString());
    setTurma(aluno.turma);
    setModalVisible(true);
  };

  // Excluir aluno
  const handleDeleteAluno = async (id) => {
    Alert.alert("Confirmar Exclusão", "Deseja realmente excluir este aluno?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        onPress: async () => {
          try {
            await alunoService.deleteAluno(id);
            setAlunos(alunos.filter((aluno) => aluno.id !== id));
          } catch (error) {
            console.error("Erro ao excluir aluno:", error);
            Alert.alert("Erro", "Não foi possível excluir o aluno.");
          }
        },
      },
    ]);
  };

  // Renderizar cada item da lista
  const renderAluno = ({ item }) => (
    <TouchableOpacity
      style={styles.alunoItem}
      onPress={() =>
        Alert.alert("Opções", `Aluno: ${item.nome}`, [
          { text: "Editar", onPress: () => handleEditAluno(item) },
          { text: "Excluir", onPress: () => handleDeleteAluno(item.id) },
          { text: "Cancelar", style: "cancel" },
        ])
      }
    >
      <Text style={styles.alunoNome}>{item.nome}</Text>
      <Text>Turma: {item.turma}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de Alunos</Text>
      <TouchableOpacity style={styles.addButton} onPress={handleAddAluno}>
        <Text style={styles.addButtonText}>Adicionar Aluno</Text>
      </TouchableOpacity>
      <FlatList
        data={alunos}
        renderItem={renderAluno}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum aluno cadastrado.</Text>
        }
      />

      {/* Modal para adicionar/editar aluno */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {editMode ? "Editar Aluno" : "Adicionar Aluno"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nome"
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
              placeholder="Telefone do Responsável"
              value={telefoneResponsavel}
              onChangeText={setTelefoneResponsavel}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Idade"
              value={idade}
              onChangeText={setIdade}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Turma"
              value={turma}
              onChangeText={setTurma}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveAluno}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  alunoItem: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  alunoNome: {
    fontSize: 18,
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: 300,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    backgroundColor: "#999",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
