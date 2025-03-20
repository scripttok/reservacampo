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
  Animated,
} from "react-native";
import { campoService } from "../services/campoService";
import { turmaService } from "../services/turmaService";
import { escolinhaService } from "../services/escolinhaService";
import { alunoService } from "../services/alunoService";
import { configService } from "../services/configService";
import { paymentService } from "../services/paymentService";
import Campo from "../components/Campo";
import { DrawerActions } from "@react-navigation/native";

export default function HomeScreen({ navigation, route }) {
  const { mode = "turmas", openAddModal, openConfigModal } = route.params || {};
  const [campos, setCampos] = useState([]);
  const [turmasOuAulas, setTurmasOuAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [campoParaExcluir, setCampoParaExcluir] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [novoCampoNome, setNovoCampoNome] = useState("");
  const [horarioInicio, setHorarioInicio] = useState("09:00");
  const [horarioFim, setHorarioFim] = useState("23:00");
  const [atrasoItem, setAtrasoItem] = useState(null);
  const [blinkAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("HomeScreen: Buscando dados, modo atual:", mode);
        const camposData = await campoService.getCampos();
        const horario = await configService.getHorarioFuncionamento();
        const paymentsData = await paymentService.getPayments();
        console.log("HomeScreen: Payments Data:", paymentsData);
        let turmasOuAulasData = [];
        if (mode === "turmas") {
          turmasOuAulasData = await turmaService.getTurmas();
          turmasOuAulasData = turmasOuAulasData.map((item) => ({
            ...item,
            type: "turma",
          }));
        } else {
          turmasOuAulasData = await escolinhaService.getAulas();
          turmasOuAulasData = turmasOuAulasData.map((item) => ({
            ...item,
            type: "aula",
          }));
        }
        setCampos(camposData);
        setTurmasOuAulas(turmasOuAulasData);
        setHorarioInicio(horario.inicio);
        setHorarioFim(horario.fim);

        const atraso = checkPaymentStatus(
          turmasOuAulasData,
          paymentsData,
          mode
        );
        console.log("HomeScreen: Item em atraso encontrado:", atraso);
        setAtrasoItem(atraso);
      } catch (error) {
        console.error("HomeScreen: Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    navigation.setParams({
      openAddModal: () => {
        console.log("HomeScreen: Abrindo modal de adicionar campo");
        setAddModalVisible(true);
      },
      openConfigModal: () => {
        console.log("HomeScreen: Abrindo modal de configurar horários");
        setConfigModalVisible(true);
      },
    });

    if (openAddModal) setAddModalVisible(true);
    if (openConfigModal) setConfigModalVisible(true);
  }, [navigation, mode]);

  const checkPaymentStatus = (items, payments, currentMode) => {
    if (!payments || !Array.isArray(payments)) {
      console.log(
        "HomeScreen: Dados de pagamentos inválidos ou ausentes:",
        payments
      );
      return null;
    }
    if (!items || !Array.isArray(items)) {
      console.log(
        "HomeScreen: Dados de turmas/alunos inválidos ou ausentes:",
        items
      );
      return null;
    }

    console.log(
      `HomeScreen: Verificando atrasos no modo ${currentMode} com ${items.length} itens`
    );

    for (const item of items) {
      // Verificação de segurança
      if (!item || !item.type || !item.createdAt) {
        console.log(
          "HomeScreen: Item inválido, faltando type ou createdAt:",
          item
        );
        continue;
      }

      const lastPayment = payments
        .filter((p) => p.itemId === item.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      const diaCadastro = new Date(item.createdAt).getDate();
      const today = new Date();

      console.log(
        `HomeScreen: Verificando item ${item.nome || item.id}, type: ${
          item.type
        }, createdAt: ${item.createdAt}`
      );

      if (!lastPayment) {
        const dataCriacao = new Date(item.createdAt);
        const proximoPagamento = new Date(dataCriacao);
        proximoPagamento.setMonth(proximoPagamento.getMonth() + 1);
        proximoPagamento.setDate(1);
        const ultimoDiaMes = new Date(
          proximoPagamento.getFullYear(),
          proximoPagamento.getMonth() + 1,
          0
        ).getDate();
        proximoPagamento.setDate(Math.min(diaCadastro, ultimoDiaMes));
        console.log(
          `HomeScreen: Sem pagamento, próximo pagamento em ${proximoPagamento}`
        );
        if (
          proximoPagamento < today &&
          ((currentMode === "turmas" && item.type !== "aluno") ||
            (currentMode === "escolinha" && item.type === "aluno"))
        ) {
          console.log(
            `HomeScreen: Atraso detectado para ${item.nome || item.id}`
          );
          return item;
        }
      } else {
        const ultimaDataPagamento = new Date(lastPayment.createdAt);
        const nextPaymentDate = new Date(ultimaDataPagamento);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        nextPaymentDate.setDate(1);
        const ultimoDiaMes = new Date(
          nextPaymentDate.getFullYear(),
          nextPaymentDate.getMonth() + 1,
          0
        ).getDate();
        nextPaymentDate.setDate(Math.min(diaCadastro, ultimoDiaMes));
        console.log(
          `HomeScreen: Último pagamento em ${ultimaDataPagamento}, próximo em ${nextPaymentDate}`
        );
        if (
          nextPaymentDate < today &&
          ((currentMode === "turmas" && item.type !== "aluno") ||
            (currentMode === "escolinha" && item.type === "aluno"))
        ) {
          console.log(
            `HomeScreen: Atraso detectado para ${item.nome || item.id}`
          );
          return item;
        }
      }
    }
    console.log("HomeScreen: Nenhum atraso encontrado");
    return null;
  };

  const handleAtrasoPress = () => {
    if (atrasoItem) {
      console.log(
        "HomeScreen: Navegando para PaymentReport com item em atraso:",
        atrasoItem
      );
      navigation.navigate("PaymentReport", { atrasoItemId: atrasoItem.id });
    }
  };

  const handleCampoPress = (campo) => {
    console.log("HomeScreen: Clicou no campo:", campo, "Modo:", mode);
    if (!campo) {
      console.error("HomeScreen: Campo é undefined!");
      return;
    }
    navigation.navigate("CampoDetail", { campo, turmas: turmasOuAulas, mode });
  };

  const handleLongPressCampo = (campo) => {
    console.log("HomeScreen: Long press no campo:", campo);
    setCampoParaExcluir(campo);
    setModalVisible(true);
  };

  const confirmDeleteCampo = async () => {
    if (campoParaExcluir) {
      try {
        await campoService.deleteCampo(campoParaExcluir.id);
        setCampos(campos.filter((c) => c.id !== campoParaExcluir.id));
        setModalVisible(false);
        setCampoParaExcluir(null);
      } catch (error) {
        console.error("HomeScreen: Erro ao deletar campo:", error);
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
        console.error("HomeScreen: Erro ao adicionar campo:", error);
        alert("Erro ao adicionar o campo.");
      }
    }
  };

  const handleSaveHorario = async () => {
    try {
      await configService.setHorarioFuncionamento(horarioInicio, horarioFim);
      setConfigModalVisible(false);
    } catch (error) {
      console.error(
        "HomeScreen: Erro ao salvar horário de funcionamento:",
        error
      );
      alert("Erro ao salvar o horário.");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Text style={styles.hamburger}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === "turmas" ? "Turmas" : "Escolinha"}
        </Text>
      </View>
      <ScrollView>
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

      {atrasoItem && (
        <Animated.View style={[styles.atrasoButton, { opacity: blinkAnim }]}>
          <TouchableOpacity onPress={handleAtrasoPress}>
            <Text style={styles.atrasoButtonText}>Pagamento Atrasado!</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f2f3a",
    padding: 10,
  },
  header: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  hamburger: {
    fontSize: 30,
    color: "#fff",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  campoContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  atrasoButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 10,
    elevation: 5,
  },
  atrasoButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
