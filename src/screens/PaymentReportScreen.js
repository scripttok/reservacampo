import React, { useState, useEffect } from "react";
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
    new Date().toISOString().split("T")[0]
  );
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [prices, setPrices] = useState({ turmas: 0, escolinha: 0, avulso: 0 });
  const [payments, setPayments] = useState([]);
  // Novo estado para o valor da busca
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReservas = async () => {
    try {
      const reservasCol = collection(db, "reservas");
      const reservasSnapshot = await getDocs(reservasCol);
      const reservasList = reservasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        type: "reserva",
      }));
      "PaymentReportScreen: Reservas recebidas:", reservasList;
      return reservasList;
    } catch (error) {
      console.error("PaymentReportScreen: Erro ao buscar reservas:", error);
      return [];
    }
  };

  const fetchData = async () => {
    try {
      const turmasData = await turmaService.getTurmas();
      "Turmas recebidas:", turmasData;
      const alunosData = await alunoService.getAlunos();
      "Alunos recebidos:", alunosData;
      const reservasData = await fetchReservas();
      const pricesData = await priceService.getPrices();
      "Preços recebidos:", pricesData;
      const paymentsData = await paymentService.getPayments();
      "Pagamentos recebidos:", paymentsData;

      setPrices(pricesData);
      setPayments(paymentsData);

      // Mapear turmas
      const turmasMapped = turmasData.map((item) => ({
        ...item,
        type: "turma",
      }));

      // Mapear alunos (apenas alunos cadastrados, sem reservas anuais)
      const alunosMapped = alunosData.map((item) => ({
        ...item,
        type: "aluno",
      }));

      // Separar reservas por tipo
      const reservasMensais = reservasData
        .filter((reserva) => reserva.tipo === "mensal")
        .map((item) => ({ ...item, type: "reserva" }));
      const reservasAvulsas = reservasData
        .filter((reserva) => reserva.tipo === "avulso" || !reserva.tipo)
        .map((item) => ({ ...item, type: "reserva" }));

      // Combinar nas seções corretas
      const combinedSections = [
        {
          title: "Turmas Cadastradas",
          data: [...turmasMapped, ...reservasMensais],
        },
        {
          title: "Alunos Cadastrados",
          data: alunosMapped, // Apenas alunos, sem reservas anuais
        },
        { title: "Reservas Avulsas", data: reservasAvulsas },
      ];
      setSections(combinedSections);

      if (atrasoItemId) {
        const item = [
          ...turmasMapped,
          ...alunosMapped,
          ...reservasMensais,
          ...reservasAvulsas,
        ].find((i) => i.id === atrasoItemId);
        if (item) handleOpenModal(item);
      }
    } catch (error) {
      console.error("PaymentReportScreen: Erro ao carregar dados:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener("focus", fetchData);
    return unsubscribe;
  }, [navigation, atrasoItemId]);

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
    const dataCriacao = new Date(createdAt);
    const diaCadastro = dataCriacao.getDate();
    const proximoPagamento = new Date(dataCriacao);

    proximoPagamento.setMonth(proximoPagamento.getMonth() + 1);
    proximoPagamento.setDate(1);
    const ultimoDiaMes = new Date(
      proximoPagamento.getFullYear(),
      proximoPagamento.getMonth() + 1,
      0
    ).getDate();
    proximoPagamento.setDate(Math.min(diaCadastro, ultimoDiaMes));

    return proximoPagamento.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPaymentStatus = (item) => {
    const lastPayment = payments
      .filter((p) => p.itemId === item.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    const dataBase = item.type === "reserva" ? item.data : item.createdAt;
    const diaCadastro = new Date(dataBase).getDate();

    if (!lastPayment) {
      const dataCriacao = new Date(dataBase);
      const proximoPagamento = new Date(dataCriacao);
      proximoPagamento.setMonth(proximoPagamento.getMonth() + 1);
      proximoPagamento.setDate(1);
      const ultimoDiaMes = new Date(
        proximoPagamento.getFullYear(),
        proximoPagamento.getMonth() + 1,
        0
      ).getDate();
      proximoPagamento.setDate(Math.min(diaCadastro, ultimoDiaMes));
      const hoje = new Date();
      return proximoPagamento < hoje
        ? { status: "Atrasado", color: "#dc3545" }
        : null;
    }

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
    const today = new Date();
    return nextPaymentDate > today
      ? { status: "Pago", color: "#28a745" }
      : { status: "Atrasado", color: "#dc3545" };
  };

  const handleRegisterPayment = async () => {
    if (!selectedItem) return;
    try {
      const newPayment = {
        tipoServico,
        valor: parseFloat(valor) || 0,
        dataPagamento,
        nomeResponsavel,
        itemId: selectedItem.id,
        itemNome: selectedItem.nome,
        createdAt: new Date().toISOString(),
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

  // Função para filtrar os dados das seções
  const filterSections = (sectionsData) => {
    if (!searchQuery) return sectionsData;

    return sectionsData
      .map((section) => ({
        ...section,
        data: section.data.filter((item) =>
          item.nome.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((section) => section.data.length > 0); // Remove seções vazias
  };

  const renderItem = ({ item }) => {
    const paymentStatus = getPaymentStatus(item);
    const valorAPagar =
      item.type === "turma"
        ? prices.turmas
        : item.type === "aluno"
        ? prices.escolinha
        : item.type === "reserva" && item.tipo === "anual"
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
              Data de Cadastro:{" "}
              {new Date(item.createdAt).toLocaleDateString("pt-BR")}
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
                ? new Date(item.createdAt).toLocaleDateString("pt-BR")
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
              Data: {new Date(item.data).toLocaleDateString("pt-BR")}
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

      {/* Novo campo de busca */}
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
            <Text style={styles.label}>Tipo de Serviço</Text>
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
                <Text style={styles.serviceButtonText}>Escolinha</Text>
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
                <Text style={styles.buttonText}>Registrar Pagamento</Text>
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
  // Novo estilo para o campo de busca
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
