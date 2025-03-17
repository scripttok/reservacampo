// src/screens/PaymentReportScreen.js
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SectionList,
  Modal,
  TextInput,
} from "react-native";
import { turmaService } from "../services/turmaService";
import { alunoService } from "../services/alunoService";
import { paymentService } from "../services/paymentService";

export default function PaymentReportScreen({ navigation }) {
  const [sections, setSections] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [tipoServico, setTipoServico] = useState("Turmas");
  const [valor, setValor] = useState("");
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [nomeResponsavel, setNomeResponsavel] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar turmas
        const turmasData = await turmaService.getTurmas();
        console.log("Turmas recebidas:", turmasData);

        // Buscar alunos
        const alunosData = await alunoService.getAlunos();
        console.log("Alunos recebidos:", alunosData);

        // Mapear os dados com type
        const turmasMapped = turmasData.map((item) => ({
          ...item,
          type: "turma",
        }));
        const alunosMapped = alunosData.map((item) => ({
          ...item,
          type: "aluno",
        }));

        // Combinar em seções
        const combinedSections = [
          { title: "Turmas Cadastradas", data: turmasMapped },
          { title: "Alunos Cadastrados", data: alunosMapped },
        ];
        console.log("Seções combinadas:", combinedSections);
        setSections(combinedSections);
      } catch (error) {
        console.error("PaymentReportScreen: Erro ao carregar dados:", error);
      }
    };
    fetchData();
  }, []);

  const calcularProximoPagamento = (createdAt) => {
    if (!createdAt) return "Indefinido";
    const dataCriacao = new Date(createdAt);
    const proximoPagamento = new Date(dataCriacao);
    proximoPagamento.setDate(dataCriacao.getDate() + 30);
    return proximoPagamento.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleRegisterPayment = async () => {
    try {
      const newPayment = {
        tipoServico,
        valor: parseFloat(valor) || 0,
        dataPagamento,
        nomeResponsavel,
        createdAt: new Date().toISOString(),
      };
      await paymentService.addPayment(newPayment);
      setModalVisible(false);
      setValor("");
      setNomeResponsavel("");
      alert("Pagamento registrado com sucesso!");
    } catch (error) {
      console.error("PaymentReportScreen: Erro ao registrar pagamento:", error);
      alert("Erro ao registrar o pagamento.");
    }
  };

  const renderItem = ({ item }) => {
    console.log("Renderizando item:", item);
    if (item.type === "turma") {
      return (
        <View style={styles.itemCard}>
          <Text style={styles.itemText}>Tipo: Turma</Text>
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
        </View>
      );
    } else if (item.type === "aluno") {
      return (
        <View style={styles.itemCard}>
          <Text style={styles.itemText}>Tipo: Aluno</Text>
          <Text style={styles.itemText}>Nome: {item.nome}</Text>
          <Text style={styles.itemText}>Responsável: {item.responsavel}</Text>
          <Text style={styles.itemText}>
            Telefone: {item.telefoneResponsavel}
          </Text>
          <Text style={styles.itemText}>Idade: {item.idade}</Text>
          <Text style={styles.itemText}>Turma: {item.turma || "Nenhuma"}</Text>
          <Text style={styles.itemText}>
            Data de Cadastro:{" "}
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString("pt-BR")
              : "Não informado"}
          </Text>
          <Text style={styles.itemText}>
            Próximo Pagamento: {calcularProximoPagamento(item.createdAt)}
          </Text>
        </View>
      );
    }
    return <Text style={styles.itemText}>Item inválido</Text>;
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Registrar Pagamento</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections} // Usamos sections em vez de data
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum dado cadastrado</Text>
        }
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        SectionSeparatorComponent={() => (
          <View style={styles.sectionSeparator} />
        )}
        stickySectionHeadersEnabled={true}
      />

      {/* Modal para registrar pagamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Registrar Pagamento</Text>

            <Text style={styles.label}>Tipo de Serviço</Text>
            <View style={styles.serviceButtons}>
              <TouchableOpacity
                style={[
                  styles.serviceButton,
                  tipoServico === "Turmas" && styles.serviceButtonSelected,
                ]}
                onPress={() => setTipoServico("Turmas")}
              >
                <Text style={styles.serviceButtonText}>Turmas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.serviceButton,
                  tipoServico === "Escolinha" && styles.serviceButtonSelected,
                ]}
                onPress={() => setTipoServico("Escolinha")}
              >
                <Text style={styles.serviceButtonText}>Escolinha</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.serviceButton,
                  tipoServico === "Avulso" && styles.serviceButtonSelected,
                ]}
                onPress={() => setTipoServico("Avulso")}
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
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleRegisterPayment}
              >
                <Text style={styles.buttonText}>Registrar</Text>
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
    backgroundColor: "#f5f5f5",
    padding: 15,
  },
  header: {
    backgroundColor: "#007AFF",
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
  addButton: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    paddingVertical: 10,
    backgroundColor: "#e0e0e0", // Cor de fundo para destacar os cabeçalhos
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
  },
  itemText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
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
    height: 15, // Espaço maior entre seções
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
    backgroundColor: "#28a745",
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
