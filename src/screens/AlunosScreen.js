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
import { Picker } from "@react-native-picker/picker";
import { alunoService } from "../services/alunoService";
import { escolinhaService } from "../services/escolinhaService";

export default function AlunosScreen({ navigation }) {
  const [alunos, setAlunos] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [professorSelecionado, setProfessorSelecionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [telefoneResponsavel, setTelefoneResponsavel] = useState("");
  const [idade, setIdade] = useState("");
  const [turma, setTurma] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const alunosData = await alunoService.getAlunos();
        const aulasData = await escolinhaService.getAulas();
        setAlunos(alunosData);

        const professoresUnicos = [
          ...new Set(aulasData.map((aula) => aula.responsavel)),
        ].filter(Boolean);
        setProfessores(professoresUnicos);

        if (professoresUnicos.length > 0) {
          setProfessorSelecionado(professoresUnicos[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        Alert.alert("Erro", "Não foi possível carregar os dados.");
      }
    };
    fetchData();
  }, []);

  const alunosFiltrados = professorSelecionado
    ? alunos.filter((aluno) => aluno.turma === professorSelecionado)
    : [];

  const handleAddAluno = () => {
    setEditMode(false);
    setAlunoSelecionado(null);
    setNome("");
    setResponsavel("");
    setTelefoneResponsavel("");
    setIdade("");
    setTurma(professores.length > 0 ? professores[0] : "");
    setModalVisible(true);
  };

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
          createdAt: alunoSelecionado.createdAt, // Preserva o createdAt original
        });
      } else {
        await alunoService.addAluno({
          nome,
          responsavel,
          telefoneResponsavel,
          idade: parseInt(idade),
          turma,
          // createdAt será adicionado automaticamente no alunoService
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

  const handleDeleteAluno = async (id) => {
    Alert.alert("Confirmar Exclusão", "Deseja realmente excluir este aluno?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        onPress: async () => {
          try {
            await alunoService.deleteAluno(id);
            const alunosData = await alunoService.getAlunos();
            setAlunos(alunosData);
          } catch (error) {
            console.error("Erro ao excluir aluno:", error);
            Alert.alert("Erro", "Não foi possível excluir o aluno.");
          }
        },
      },
    ]);
  };

  const renderProfessor = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.professorItem,
        professorSelecionado === item && styles.professorItemSelected,
      ]}
      onPress={() => setProfessorSelecionado(item)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.professorText,
          professorSelecionado === item && styles.professorTextSelected,
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

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
      <Text>Responsável: {item.responsavel}</Text>
      <Text>Telefone: {item.telefoneResponsavel}</Text>
      <Text>Idade: {item.idade}</Text>
      {/* Opcional: exibir createdAt na lista de alunos */}
      <Text>
        Data de Cadastro:{" "}
        {item.createdAt
          ? new Date(item.createdAt).toLocaleDateString("pt-BR")
          : "Não informado"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de Alunos por Turma</Text>
      <View>
        <FlatList
          data={professores}
          renderItem={renderProfessor}
          keyExtractor={(item) => item}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          style={styles.professorList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum professor cadastrado.</Text>
          }
        />
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddAluno}>
        <Text style={styles.addButtonText}>Adicionar Aluno</Text>
      </TouchableOpacity>
      <FlatList
        data={alunosFiltrados}
        renderItem={renderAluno}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {professorSelecionado
              ? "Nenhum aluno nesta turma."
              : "Selecione uma turma para ver os alunos."}
          </Text>
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
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Professor (Turma):</Text>
              <Picker
                selectedValue={turma}
                onValueChange={(itemValue) => setTurma(itemValue)}
                style={styles.picker}
              >
                {professores.length === 0 ? (
                  <Picker.Item label="Nenhum professor disponível" value="" />
                ) : (
                  professores.map((professor) => (
                    <Picker.Item
                      key={professor}
                      label={professor}
                      value={professor}
                    />
                  ))
                )}
              </Picker>
            </View>
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
    padding: 30,
    backgroundColor: "#f5f5f5",
    marginTop: 30,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  professorList: {
    marginBottom: 1,
  },
  professorItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 5,
    backgroundColor: "#ddd",
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "30%",
  },
  professorItemSelected: {
    backgroundColor: "#007AFF",
  },
  professorText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  professorTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
    marginTop: 5,
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
    marginBottom: 5,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    paddingLeft: 5,
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
  pickerContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
  },
  pickerLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
    paddingHorizontal: 10,
    paddingTop: 5,
  },
  picker: {
    width: "100%",
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
