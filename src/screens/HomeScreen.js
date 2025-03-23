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
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Adicionado
import { campoService } from "../services/campoService";
import { turmaService } from "../services/turmaService";
import { escolinhaService } from "../services/escolinhaService";
import { alunoService } from "../services/alunoService";
import { configService } from "../services/configService";
import { paymentService } from "../services/paymentService";
import { db } from "../services/firebaseService"; // Adicionado para buscar reservas
import { collection, query, getDocs } from "firebase/firestore"; // Adicionado
import moment from "moment"; // Adicionado para manipulação de datas
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
        "HomeScreen: Buscando dados, modo atual:", mode;
        const camposData = await campoService.getCampos();
        const horario = await configService.getHorarioFuncionamento();
        const paymentsData = await paymentService.getPayments();
        "HomeScreen: Payments Data:", paymentsData;
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
        "HomeScreen: Item em atraso encontrado:", atraso;
        setAtrasoItem(atraso);

        // Verificar aluguéis mensais próximos do vencimento
        await checkMonthlyRentalsExpiration();
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
        ("HomeScreen: Abrindo modal de adicionar campo");
        setAddModalVisible(true);
      },
      openConfigModal: () => {
        ("HomeScreen: Abrindo modal de configurar horários");
        setConfigModalVisible(true);
      },
    });

    if (openAddModal) setAddModalVisible(true);
    if (openConfigModal) setConfigModalVisible(true);
  }, [navigation, mode]);

  const fetchReservasMensais = async () => {
    try {
      ("HomeScreen: Buscando reservas mensais");
      const reservasRef = collection(db, "reservas");
      const q = query(reservasRef);
      const querySnapshot = await getDocs(q);
      const reservasData = [];
      querySnapshot.forEach((doc) => {
        reservasData.push({ id: doc.id, ...doc.data() });
      });
      const mensais = reservasData.filter(
        (reserva) => reserva.tipo === "mensal"
      );
      "HomeScreen: Reservas mensais encontradas:", mensais;
      return mensais;
    } catch (error) {
      console.error("Erro ao buscar reservas mensais do Firestore:", error);
      return [];
    }
  };

  const checkMonthlyRentalsExpiration = async () => {
    ("HomeScreen: Verificando vencimento de aluguéis mensais");
    const reservasMensais = await fetchReservasMensais();
    const today = moment(); // Data atual do sistema
    const todayStr = today.format("YYYY-MM-DD");
    "HomeScreen: Data atual:", todayStr;

    for (const reserva of reservasMensais) {
      const dataInicial = moment(reserva.data);
      const dataVencimento = dataInicial.clone().add(1, "month");
      const startOfLastWeek = dataVencimento
        .clone()
        .startOf("week")
        .add(1, "day"); // Segunda-feira

      `HomeScreen: Reserva "${reserva.nome}", início: ${dataInicial.format(
        "DD/MM/YYYY"
      )}, vencimento: ${dataVencimento.format(
        "DD/MM/YYYY"
      )}, início última semana: ${startOfLastWeek.format("DD/MM/YYYY")}`;

      if (
        today.isBetween(startOfLastWeek, dataVencimento, null, "[]") &&
        today.isSameOrBefore(dataVencimento)
      ) {
        const lastAlertKey = `lastAlert_${reserva.id}`;
        const lastAlertDate = await AsyncStorage.getItem(lastAlertKey);
        const lastAlertMoment = lastAlertDate ? moment(lastAlertDate) : null;

        `HomeScreen: Reserva "${
          reserva.nome
        }" na última semana. Último alerta: ${lastAlertDate || "nenhum"}`;

        if (!lastAlertMoment || !lastAlertMoment.isSame(today, "day")) {
          Alert.alert(
            "Aluguel Mensal Prestes a Vencer",
            `O aluguel mensal "${
              reserva.nome
            }" vence em ${dataVencimento.format(
              "DD/MM/YYYY"
            )} (${dataVencimento.fromNow()}).`,
            [{ text: "OK", onPress: () => "Alerta confirmado" }]
          );
          await AsyncStorage.setItem(lastAlertKey, todayStr);
          `HomeScreen: Alerta exibido para "${reserva.nome}", salvo em ${lastAlertKey}`;
        } else {
          `HomeScreen: Alerta para "${reserva.nome}" já exibido hoje`;
        }
      } else {
        `HomeScreen: Reserva "${reserva.nome}" fora da última semana`;
      }
    }
  };

  const checkPaymentStatus = async (items, payments, currentMode) => {
    if (!payments || !Array.isArray(payments)) return null;
    if (!items || !Array.isArray(items)) return null;

    // Buscar reservas do Firestore
    const reservasRef = collection(db, "reservas");
    const q = query(reservasRef);
    const querySnapshot = await getDocs(q);
    const reservasData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      type: "reserva",
    }));

    const todosItens = [
      ...items,
      ...reservasData.map((reserva) => ({
        ...reserva,
        createdAt: reserva.data, // Usar 'data' como createdAt para reservas
      })),
    ];

    for (const item of todosItens) {
      if (!item || !item.type || !item.createdAt) continue;

      const lastPayment = payments
        .filter((p) => p.itemId === item.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      const diaCadastro = new Date(item.createdAt).getDate();
      const today = new Date();

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
        if (
          proximoPagamento < today &&
          ((currentMode === "turmas" &&
            (item.type === "turma" ||
              item.tipo === "mensal" ||
              item.tipo === "avulso")) ||
            (currentMode === "escolinha" &&
              (item.type === "aluno" || item.tipo === "anual")))
        ) {
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
        if (
          nextPaymentDate < today &&
          ((currentMode === "turmas" &&
            (item.type === "turma" ||
              item.tipo === "mensal" ||
              item.tipo === "avulso")) ||
            (currentMode === "escolinha" &&
              (item.type === "aluno" || item.tipo === "anual")))
        ) {
          return item;
        }
      }
    }
    return null;
  };

  const handleAtrasoPress = () => {
    if (atrasoItem) {
      "HomeScreen: Navegando para PaymentReport com item em atraso:",
        atrasoItem;
      navigation.navigate("PaymentReport", { atrasoItemId: atrasoItem.id });
    }
  };

  const handleCampoPress = (campo) => {
    "HomeScreen: Clicou no campo:", campo, "Modo:", mode;
    if (!campo) {
      console.error("HomeScreen: Campo é undefined!");
      return;
    }
    navigation.navigate("CampoDetail", { campo, turmas: turmasOuAulas, mode });
  };

  const handleLongPressCampo = (campo) => {
    "HomeScreen: Long press no campo:", campo;
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
