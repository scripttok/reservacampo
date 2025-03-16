// src/screens/HomeScreen.js
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
} from "react-native";
import { campoService } from "../services/campoService";
import { turmaService } from "../services/turmaService";
import { escolinhaService } from "../services/escolinhaService";
import { configService } from "../services/configService";
import { checkHorarioConflito } from "../utils/horarioUtils";
import Campo from "../components/Campo";
import { DrawerActions } from "@react-navigation/native";

export default function HomeScreen({ navigation, route, mode }) {
  const [campos, setCampos] = useState([]);
  const [turmasOuAulas, setTurmasOuAulas] = useState([]);
  const [todosHorarios, setTodosHorarios] = useState([]);
  const [conflitos, setConflitos] = useState([]); // Novo estado para conflitos
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [campoParaExcluir, setCampoParaExcluir] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [novoCampoNome, setNovoCampoNome] = useState("");
  const [horarioInicio, setHorarioInicio] = useState("09:00");
  const [horarioFim, setHorarioFim] = useState("23:00");

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("HomeScreen: Buscando dados, modo atual:", mode);
        const camposData = await campoService.getCampos();
        let turmasOuAulasData = [];
        if (mode === "turmas") {
          turmasOuAulasData = await turmaService.getTurmas();
          console.log(
            "HomeScreen: Turmas carregadas:",
            turmasOuAulasData.length
          );
        } else {
          turmasOuAulasData = await escolinhaService.getAulas();
          console.log(
            "HomeScreen: Aulas carregadas:",
            turmasOuAulasData.length
          );
        }

        setCampos(camposData);
        setTurmasOuAulas(turmasOuAulasData);

        const conflitos = turmasOuAulasData.filter((item, index, self) =>
          self.some(
            (other, otherIndex) =>
              index !== otherIndex &&
              item.dia === other.dia &&
              item.campoId === other.campoId &&
              checkHorarioConflito(item, other)
          )
        );
        if (conflitos.length > 0) {
          console.log(
            "HomeScreen: Conflitos de horário encontrados:",
            conflitos
          );
        } else {
          console.log("HomeScreen: Nenhum conflito de horário encontrado.");
        }
      } catch (error) {
        console.error("HomeScreen: Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const unsubscribe = navigation.addListener("focus", fetchData);
    return () => unsubscribe();
  }, [navigation, mode]);

  const isEmAtraso = (createdAt) => {
    if (!createdAt) return false;
    const dataCriacao = new Date(createdAt);
    const proximoPagamento = new Date(dataCriacao);
    proximoPagamento.setDate(dataCriacao.getDate() + 30);
    const hoje = new Date();
    return hoje > proximoPagamento;
  };

  const emAtraso = turmasOuAulas.filter((item) => isEmAtraso(item.createdAt));

  const handleLongPressCampo = (campo) => {
    console.log("HomeScreen: Long press no campo:", campo);
    setCampoParaExcluir(campo);
    setModalVisible(true);
  };

  const handleCampoPress = (campo) => {
    console.log("HomeScreen: Clicou no campo:", campo, "Modo:", mode);
    if (!campo) {
      console.error("HomeScreen: Campo é undefined!");
      return;
    }
    navigation.navigate("CampoDetail", { campo, turmas: turmasOuAulas, mode });
  };

  // src/screens/HomeScreen.js (apenas a parte relevante)
  const handleAtrasadaPress = (item) => {
    const campo = campos.find((c) => c.id === item.campoId);
    if (campo) {
      console.log(
        `HomeScreen: Navegando para campo ${
          mode === "turmas" ? "da turma" : "da aula"
        } em atraso:`,
        campo.nome,
        "Dia:",
        item.dia,
        "ID:",
        item.id
      );
      navigation.navigate("CampoDetail", {
        campo,
        turmas: turmasOuAulas,
        diaSelecionado: item.dia.toLowerCase(), // Já está correto, mas vamos confirmar
        itemId: item.id, // Passa o ID da turma/aula clicada
      });
    } else {
      console.error("HomeScreen: Campo não encontrado para o item:", item);
    }
  };

  const confirmDeleteCampo = async () => {
    if (campoParaExcluir) {
      try {
        await campoService.deleteCampo(campoParaExcluir.id);
        setCampos(campos.filter((c) => c.id !== campoParaExcluir.id));
        setModalVisible(false);
        setCampoParaExcluir(null);
      } catch (error) {
        console.error("Erro ao deletar campo:", error);
        alert("Erro ao deletar o campo.");
      }
    }
  };

  const cancelDeleteCampo = () => {
    setModalVisible(false);
    setCampoParaExcluir(null);
  };

  const handleAddCampo = async () => {
    if (novoCampoNome.trim()) {
      try {
        await campoService.addCampo(novoCampoNome);
        const camposData = await campoService.getCampos();
        setCampos(camposData);
        setAddModalVisible(false);
        setNovoCampoNome("");
      } catch (error) {
        console.error("Erro ao adicionar campo:", error);
        alert("Erro ao adicionar o campo.");
      }
    }
  };

  const handleSaveHorario = async () => {
    try {
      await configService.setHorarioFuncionamento(horarioInicio, horarioFim);
      setConfigModalVisible(false);
    } catch (error) {
      console.error("Erro ao salvar horário de funcionamento:", error);
      alert("Erro ao salvar o horário.");
    }
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const renderAtrasoCard = ({ item }) => (
    <TouchableOpacity
      style={styles.atrasoCard}
      onPress={() => handleAtrasadaPress(item)}
    >
      <Text style={styles.atrasoText}>{item.responsavel}</Text>
    </TouchableOpacity>
  );

  const renderConflitoCard = ({ item }) => (
    <View style={styles.conflitoCard}>
      <Text style={styles.conflitoText}>
        Conflito: {item.turma} vs {item.aula}
      </Text>
      <Text style={styles.conflitoText}>
        {item.dia} - {item.horario} (Campo:{" "}
        {campos.find((c) => c.id === item.campoId)?.nome || item.campoId})
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#fff" }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer}>
          <Text style={styles.hamburger}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === "turmas" ? "Turmas" : "Escolinha"}
        </Text>
      </View>

      {conflitos.length > 0 && (
        <View style={styles.conflitoContainer}>
          <Text style={styles.conflitoTitle}>Conflitos de Horário</Text>
          <FlatList
            data={conflitos}
            renderItem={renderConflitoCard}
            keyExtractor={(item, index) => `conflito-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.conflitoList}
          />
        </View>
      )}

      {emAtraso.length > 0 && (
        <View style={styles.atrasoContainer}>
          <Text style={styles.atrasoTitle}>
            {mode === "turmas" ? "Turmas em Atraso" : "Aulas em Atraso"}
          </Text>
          <FlatList
            data={emAtraso}
            renderItem={renderAtrasoCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.atrasoList}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {campos.map((campo) => (
          <View key={campo.id} style={styles.campoContainer}>
            <Campo
              campo={campo}
              proximoHorario={null}
              onPress={() => handleCampoPress(campo)}
              onLongPress={() => handleLongPressCampo(campo)}
            />
          </View>
        ))}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={cancelDeleteCampo}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirmar Exclusão</Text>
            <Text style={styles.modalText}>
              Deseja realmente excluir o campo "{campoParaExcluir?.nome}"?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelDeleteCampo}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmDeleteCampo}
              >
                <Text style={styles.buttonText}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Adicionar Campo</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do campo"
              value={novoCampoNome}
              onChangeText={setNovoCampoNome}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleAddCampo}
              >
                <Text style={styles.buttonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={configModalVisible}
        onRequestClose={() => setConfigModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Configurar Horários</Text>
            <TextInput
              style={styles.input}
              placeholder="Início (ex.: 07:00)"
              value={horarioInicio}
              onChangeText={setHorarioInicio}
            />
            <TextInput
              style={styles.input}
              placeholder="Fim (ex.: 23:00)"
              value={horarioFim}
              onChangeText={setHorarioFim}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfigModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleSaveHorario}
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
    backgroundColor: "#04394e",
    padding: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 1,
  },
  hamburger: {
    marginTop: 50,
    fontSize: 30,
    color: "#fff",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 20,
  },
  conflitoContainer: {
    marginBottom: 5,
    padding: 1,
    backgroundColor: "transparent",
    borderRadius: 5,
  },
  conflitoTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  conflitoList: {
    flexGrow: 0,
  },
  conflitoCard: {
    backgroundColor: "#ffcc00", // Amarelo para destacar conflitos
    padding: 5,
    borderRadius: 5,
    marginRight: 10,
    minWidth: 150,
  },
  conflitoText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  atrasoContainer: {
    marginBottom: 5,
    padding: 1,
    backgroundColor: "transparent",
    borderRadius: 5,
  },
  atrasoTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  atrasoList: {
    flexGrow: 0,
  },
  atrasoCard: {
    backgroundColor: "#fa023c",
    padding: 5,
    borderRadius: 5,
    marginRight: 10,
    minWidth: 50,
    alignItems: "center",
  },
  atrasoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  scrollContent: {
    alignItems: "center",
  },
  campoContainer: {
    marginBottom: 10,
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
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "#999",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  confirmButton: {
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
