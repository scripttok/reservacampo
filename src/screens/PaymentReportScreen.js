import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SectionList,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import moment from "moment";
import { turmaService } from "../services/turmaService";
import { alunoService } from "../services/alunoService";
import { paymentService } from "../services/paymentService";
import { priceService } from "../services/priceService";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebaseService";

export default function PaymentReportScreen({ navigation, route }) {
  const { atrasoItemId } = route.params || {};
  const [sections, setSections] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [tipoServico, setTipoServico] = useState("");
  const [valor, setValor] = useState("");
  const [dataPagamento, setDataPagamento] = useState(
    moment().format("YYYY-MM-DD")
  );
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [prices, setPrices] = useState({ turmas: 0, escolinha: 0, avulso: 0 });
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [forceUpdate, setForceUpdate] = useState(0); // Novo estado para forçar atualização

  const fetchReservas = async () => {
    try {
      const reservasCol = collection(db, "reservas");
      const reservasSnapshot = await getDocs(reservasCol);
      const reservasList = reservasSnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log(
          "PaymentReportScreen: Reserva ID:",
          doc.id,
          "Data:",
          data.data
        );
        return {
          id: doc.id,
          ...data,
          type: "reserva",
          createdAt: data.createdAt || data.data,
        };
      });
      console.log(
        "PaymentReportScreen: Reservas recebidas:",
        reservasList.length
      );
      return reservasList;
    } catch (error) {
      console.error("PaymentReportScreen: Erro ao buscar reservas:", error);
      return [];
    }
  };

  const fetchData = useCallback(async () => {
    console.log("PaymentReportScreen: Iniciando fetchData");
    try {
      // Limpar estado para evitar dados antigos
      setSections([]);
      const turmasData = await turmaService.getTurmas();
      console.log("PaymentReportScreen: Turmas recebidas:", turmasData.length);
      const alunosData = await alunoService.getAlunos();
      console.log("PaymentReportScreen: Alunos recebidos:", alunosData.length);
      const reservasData = await fetchReservas();
      const pricesData = await priceService.getPrices();
      console.log("PaymentReportScreen: Preços recebidos:", pricesData);
      const paymentsData = await paymentService.getPayments();
      console.log(
        "PaymentReportScreen: Pagamentos recebidos:",
        paymentsData.length
      );

      setPrices(pricesData);
      setPayments(paymentsData);

      const turmasMapped = turmasData.map((item) => ({
        ...item,
        type: "turma",
      }));

      const alunosMapped = alunosData.map((item) => ({
        ...item,
        type: "aluno",
      }));

      const reservasMensais = reservasData
        .filter((reserva) => reserva.tipo === "mensal")
        .map((item) => ({ ...item, type: "reserva" }));
      const reservasAnuais = reservasData
        .filter((reserva) => reserva.tipo === "anual")
        .map((item) => ({ ...item, type: "reserva" }));
      const reservasAvulsas = reservasData
        .filter((reserva) => reserva.tipo === "avulso" || !reserva.tipo)
        .map((item) => ({ ...item, type: "reserva" }));

      const combinedSections = [
        {
          title: "Turmas Cadastradas",
          data: [...turmasMapped, ...reservasMensais],
        },
        {
          title: "Aulas Anuais (Escolinha)",
          data: [...alunosMapped, ...reservasAnuais],
        },
        { title: "Reservas Avulsas", data: reservasAvulsas },
      ];
      setSections(combinedSections);
      console.log("PaymentReportScreen: Seções atualizadas:", combinedSections);

      if (atrasoItemId) {
        const item = [
          ...turmasMapped,
          ...alunosMapped,
          ...reservasMensais,
          ...reservasAnuais,
          ...reservasAvulsas,
        ].find((i) => i.id === atrasoItemId);
        if (item) handleOpenModal(item);
      }
    } catch (error) {
      console.error("PaymentReportScreen: Erro ao carregar dados:", error);
    }
  }, [atrasoItemId]);

  useEffect(() => {
    console.log(
      "PaymentReportScreen: useEffect disparado, forceUpdate:",
      forceUpdate
    );
    fetchData();
    const unsubscribe = navigation.addListener("focus", () => {
      console.log("PaymentReportScreen: Tela em foco, recarregando dados");
      setForceUpdate((prev) => prev + 1); // Forçar atualização
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData, forceUpdate]);

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    if (item.type === "turma") {
      setTipoServico("Turmas");
      setValor(prices.turmas.toString());
    } else if (item.type === "aluno") {
      setTipoServico("Escolinha");
      setValor(prices.escolinha.toString());
    } else if (item.type === "reserva") {
      setTipoServico(
        item.tipo === "anual"
          ? "Escolinha"
          : item.tipo === "mensal"
          ? "Turmas"
          : "Avulso"
      );
      setValor(
        item.tipo === "anual"
          ? prices.escolinha.toString()
          : item.tipo === "mensal"
          ? prices.turmas.toString()
          : prices.avulso.toString()
      );
    }
    setNomeResponsavel(item.responsavel || "");
    setModalVisible(true);
  };

  const calcularProximoPagamento = (createdAt) => {
    if (!createdAt) return "Indefinido";
    const dataCriacao = moment(createdAt);
    const diaCadastro = dataCriacao.date();
    const proximoPagamento = dataCriacao.clone().add(1, "month").date(1);
    const ultimoDiaMes = proximoPagamento.clone().endOf("month").date();
    proximoPagamento.date(Math.min(diaCadastro, ultimoDiaMes));
    return proximoPagamento.format("DD/MM/YYYY");
  };

  const getPaymentStatus = (item) => {
    const lastPayment = payments
      .filter((p) => p.itemId === item.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    const dataBase = item.type === "reserva" ? item.data : item.createdAt;
    const diaCadastro = moment(dataBase).date();

    if (!lastPayment) {
      const dataCriacao = moment(dataBase);
      const proximoPagamento = dataCriacao.clone().add(1, "month").date(1);
      const ultimoDiaMes = proximoPagamento.clone().endOf("month").date();
      proximoPagamento.date(Math.min(diaCadastro, ultimoDiaMes));
      const hoje = moment();
      return proximoPagamento.isBefore(hoje)
        ? { status: "Atrasado", color: "#dc3545" }
        : null;
    }

    const ultimaDataPagamento = moment(lastPayment.createdAt);
    const nextPaymentDate = ultimaDataPagamento.clone().add(1, "month").date(1);
    const ultimoDiaMes = nextPaymentDate.clone().endOf("month").date();
    nextPaymentDate.date(Math.min(diaCadastro, ultimoDiaMes));
    const today = moment();
    return nextPaymentDate.isAfter(today)
      ? { status: "Pago", color: "#28a745" }
      : { status: "Atrasado", color: "#dc3545" };
  };

  const handleRegisterPayment = async () => {
    if (!selectedItem) return;
    if (!moment(dataPagamento, "YYYY-MM-DD", true).isValid()) {
      alert("Data de pagamento deve estar no formato YYYY-MM-DD!");
      return;
    }
    try {
      const newPayment = {
        tipoServico,
        valor: parseFloat(valor) || 0,
        dataPagamento,
        nomeResponsavel,
        itemId: selectedItem.id,
        itemNome: selectedItem.nome,
        createdAt: moment().toISOString(),
      };
      await paymentService.addPayment(newPayment);

      setPayments((prevPayments) => [...prevPayments, newPayment]);

      await fetchData();
      setModalVisible(false);
      setValor("");
      alert(`Pagamento registrado para ${selectedItem.nome}!`);
    } catch (error) {
      console.error("PaymentReportScreen: Erro ao registrar pagamento:", error);
      alert("Erro ao registrar o pagamento.");
    }
  };

  const handleEditItem = () => {
    if (!selectedItem) return;
    navigation.navigate(
      selectedItem.type === "turma"
        ? "Turmas"
        : selectedItem.type === "aluno"
        ? "Alunos"
        : "CalendarioScreen",
      { item: selectedItem }
    );
    setModalVisible(false);
  };

  const handleDeleteItem = () => {
    if (!selectedItem) return;
    Alert.alert("Confirmar Exclusão", `Deseja excluir ${selectedItem.nome}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        onPress: async () => {
          try {
            if (selectedItem.type === "turma") {
              await turmaService.deleteTurma(selectedItem.id);
            } else if (selectedItem.type === "aluno") {
              await alunoService.deleteAluno(selectedItem.id);
            } else if (selectedItem.type === "reserva") {
              await deleteDoc(doc(db, "reservas", selectedItem.id));
            }
            await fetchData();
            setModalVisible(false);
            alert(`${selectedItem.nome} excluído com sucesso!`);
          } catch (error) {
            console.error("Erro ao excluir item:", error);
            alert("Erro ao excluir o item.");
          }
        },
      },
    ]);
  };

  const filterSections = (sectionsData) => {
    if (!searchQuery) return sectionsData;

    return sectionsData
      .map((section) => ({
        ...section,
        data: section.data.filter((item) =>
          item.nome.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((section) => section.data.length > 0);
  };

  const renderItem = ({ item }) => {
    const paymentStatus = getPaymentStatus(item);
    const valorAPagar =
      item.type === "turma"
        ? prices.turmas
        : item.type === "aluno" ||
          (item.type === "reserva" && item.tipo === "anual")
        ? prices.escolinha
        : item.type === "reserva" && item.tipo === "mensal"
        ? prices.turmas
        : prices.avulso;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleOpenModal(item)}
      >
        {item.type === "turma" ? (
          <>
            <Text style={styles.itemText}>Tipo: Turma (Mensal)</Text>
            <Text style={styles.itemText}>Nome: {item.nome}</Text>
            <Text style={styles.itemText}>Responsável: {item.responsavel}</Text>
            <Text style={styles.itemText}>Telefone: {item.telefone}</Text>
            <Text style={styles.itemText}>Dia: {item.dia}</Text>
            <Text style={styles.itemText}>
              Horário: {item.inicio} - {item.fim}
            </Text>
            <Text style={styles.itemText}>
              Data de Cadastro: {moment(item.createdAt).format("DD/MM/YYYY")}
            </Text>
            <Text style={styles.itemText}>
              Próximo Pagamento: {calcularProximoPagamento(item.createdAt)}
            </Text>
            <Text style={styles.itemText}>Valor a Pagar: R$ {valorAPagar}</Text>
          </>
        ) : item.type === "aluno" ? (
          <>
            <Text style={styles.itemText}>Tipo: Aluno (Anual)</Text>
            <Text style={styles.itemText}>Nome: {item.nome}</Text>
            <Text style={styles.itemText}>Responsável: {item.responsavel}</Text>
            <Text style={styles.itemText}>
              Telefone: {item.telefoneResponsavel}
            </Text>
            <Text style={styles.itemText}>Idade: {item.idade}</Text>
            <Text style={styles.itemText}>
              Turma: {item.turma || "Nenhuma"}
            </Text>
            <Text style={styles.itemText}>
              Data de Cadastro:{" "}
              {item.createdAt
                ? moment(item.createdAt).format("DD/MM/YYYY")
                : "Não informado"}
            </Text>
            <Text style={styles.itemText}>
              Próximo Pagamento: {calcularProximoPagamento(item.createdAt)}
            </Text>
            <Text style={styles.itemText}>Valor a Pagar: R$ {valorAPagar}</Text>
          </>
        ) : (
          <>
            <Text style={styles.itemText}>
              Tipo: Reserva (
              {item.tipo === "anual"
                ? "Anual"
                : item.tipo === "mensal"
                ? "Mensal"
                : "Avulso"}
              )
            </Text>
            <Text style={styles.itemText}>Nome: {item.nome}</Text>
            <Text style={styles.itemText}>Responsável: {item.responsavel}</Text>
            <Text style={styles.itemText}>Telefone: {item.telefone}</Text>
            <Text style={styles.itemText}>
              Data: {moment(item.data).format("DD/MM/YYYY")}
            </Text>
            <Text style={styles.itemText}>
              Horário: {item.horarioInicio} - {item.horarioFim}
            </Text>
            <Text style={styles.itemText}>
              Próximo Pagamento:{" "}
              {calcularProximoPagamento(item.createdAt || item.data)}
            </Text>
            <Text style={styles.itemText}>Valor a Pagar: R$ {valorAPagar}</Text>
          </>
        )}
        {paymentStatus && (
          <View
            style={[styles.statusBox, { backgroundColor: paymentStatus.color }]}
          >
            <Text style={styles.statusText}>{paymentStatus.status}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title, data } }) => (
    <Text style={styles.sectionTitle}>
      {title} ({data.length})
    </Text>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relatório de Pagamentos</Text>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por nome..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <SectionList
        sections={filterSections(sections)}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery
              ? "Nenhum resultado encontrado"
              : "Nenhum dado cadastrado"}
          </Text>
        }
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        SectionSeparatorComponent={() => (
          <View style={styles.sectionSeparator} />
        )}
        stickySectionHeadersEnabled={true}
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {selectedItem ? `${selectedItem.nome} - Ações` : "Ações"}
            </Text>
            <Text style={styles.label}>Registrar Pagamento</Text>
            <View style={styles.serviceButtons}>
              <TouchableOpacity
                style={[
                  styles.serviceButton,
                  tipoServico === "Turmas" && styles.serviceButtonSelected,
                ]}
                onPress={() => {
                  setTipoServico("Turmas");
                  setValor(prices.turmas.toString());
                }}
              >
                <Text style={styles.serviceButtonText}>Turmas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.serviceButton,
                  tipoServico === "Escolinha" && styles.serviceButtonSelected,
                ]}
                onPress={() => {
                  setTipoServico("Escolinha");
                  setValor(prices.escolinha.toString());
                }}
              >
                <Text style={styles.serviceButtonText}>Escola</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.serviceButton,
                  tipoServico === "Avulso" && styles.serviceButtonSelected,
                ]}
                onPress={() => {
                  setTipoServico("Avulso");
                  setValor(prices.avulso.toString());
                }}
              >
                <Text style={styles.serviceButtonText}>Avulso</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Valor (R$)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: 200.00"
              keyboardType="numeric"
              value={valor}
              onChangeText={setValor}
            />
            <Text style={styles.label}>Data do Pagamento</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={dataPagamento}
              onChangeText={setDataPagamento}
            />
            <Text style={styles.label}>Nome do Responsável</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: João Silva"
              value={nomeResponsavel}
              onChangeText={setNomeResponsavel}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRegisterPayment}
              >
                <Text style={styles.buttonText}>Pagar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleEditItem}
              >
                <Text style={styles.buttonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteItem}
              >
                <Text style={styles.buttonText}>Excluir</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    flex: 1,
    backgroundColor: "#1f2f3a",
    padding: 15,
  },
  header: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    paddingVertical: 10,
    backgroundColor: "#2ecc71",
  },
  itemCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  itemText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
  },
  statusBox: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
    borderRadius: 5,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginVertical: 20,
  },
  itemSeparator: {
    height: 5,
  },
  sectionSeparator: {
    height: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: 320,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
    alignSelf: "flex-start",
  },
  serviceButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 15,
  },
  serviceButton: {
    flex: 1,
    padding: 10,
    backgroundColor: "#ddd",
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  serviceButtonSelected: {
    backgroundColor: "#007AFF",
  },
  serviceButtonText: {
    color: "#333",
    fontWeight: "bold",
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
    width: "100%",
    marginBottom: 10,
  },
  actionButton: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#999",
    padding: 10,
    borderRadius: 5,
    width: "50%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  searchInput: {
    width: "100%",
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
  },
});
