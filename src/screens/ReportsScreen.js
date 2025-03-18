// src/screens/ReportsScreen.js
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { paymentService } from "../services/paymentService";
import { turmaService } from "../services/turmaService";
import { alunoService } from "../services/alunoService";
import { priceService } from "../services/priceService";

export default function ReportsScreen({ navigation }) {
  const [lucroTotal, setLucroTotal] = useState({
    turmas: 0,
    escolinha: 0,
    avulso: 0,
  });
  const [turmasLucro, setTurmasLucro] = useState([]);
  const [horariosLucro, setHorariosLucro] = useState([]);
  const [diasCheios, setDiasCheios] = useState([]);
  const [atrasos, setAtrasos] = useState([]);

  const fetchData = async () => {
    try {
      const payments = await paymentService.getPayments();
      const turmas = await turmaService.getTurmas();
      const alunos = await alunoService.getAlunos();
      const prices = await priceService.getPrices();

      // Lucro total com verificação de tipoServico
      const lucro = payments.reduce(
        (acc, payment) => {
          const tipoServico = payment.tipoServico
            ? payment.tipoServico.toLowerCase()
            : "desconhecido";
          if (["turmas", "escolinha", "avulso"].includes(tipoServico)) {
            acc[tipoServico] += payment.valor;
          } else {
            console.warn(
              `ReportsScreen: Tipo de serviço inválido ou desconhecido: ${tipoServico}`
            );
          }
          return acc;
        },
        { turmas: 0, escolinha: 0, avulso: 0 }
      );
      setLucroTotal(lucro);

      // Lucro por turma
      const turmasLucroData = turmas
        .map((turma) => {
          const turmaPayments = payments.filter(
            (p) => p.itemId === turma.id && p.tipoServico === "Turmas"
          );
          const total = turmaPayments.reduce((sum, p) => sum + p.valor, 0);
          return { nome: turma.nome, total };
        })
        .sort((a, b) => b.total - a.total);
      setTurmasLucro(turmasLucroData);

      // Lucro por horário
      const horariosLucroData = turmas.reduce((acc, turma) => {
        const horario = `${turma.inicio} - ${turma.fim}`;
        const turmaPayments = payments.filter(
          (p) => p.itemId === turma.id && p.tipoServico === "Turmas"
        );
        const total = turmaPayments.reduce((sum, p) => sum + p.valor, 0);
        acc[horario] = (acc[horario] || 0) + total;
        return acc;
      }, {});
      const horariosArray = Object.entries(horariosLucroData)
        .map(([horario, total]) => ({ horario, total }))
        .sort((a, b) => b.total - a.total);
      setHorariosLucro(horariosArray);

      // Dias mais cheios
      const diasCheiosData = turmas.reduce((acc, turma) => {
        acc[turma.dia] = (acc[turma.dia] || 0) + 1;
        return acc;
      }, {});
      const diasArray = Object.entries(diasCheiosData)
        .map(([dia, count]) => ({ dia, count }))
        .sort((a, b) => b.count - a.count);
      setDiasCheios(diasArray);

      // Turmas e Alunos em atraso
      const turmasComType = turmas.map((turma) => ({
        ...turma,
        type: "turma",
      }));
      const alunosComType = alunos.map((aluno) => ({
        ...aluno,
        type: "aluno",
      }));
      const todosItens = [...turmasComType, ...alunosComType];
      const atrasosData = calcularAtrasos(todosItens, payments, prices);
      setAtrasos(atrasosData);
    } catch (error) {
      console.error("ReportsScreen: Erro ao carregar dados:", error);
      Alert.alert(
        "Erro",
        "Não foi possível carregar os dados para os relatórios."
      );
    }
  };

  const calcularAtrasos = (items, payments, prices) => {
    const atrasados = [];
    const today = new Date();

    items.forEach((item) => {
      const lastPayment = payments
        .filter((p) => p.itemId === item.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      const diaCadastro = new Date(item.createdAt).getDate();

      if (!lastPayment) {
        const dataCriacao = new Date(item.createdAt);
        const proximoPagamento = new Date(dataCriacao);
        proximoPagamento.setMonth(proximoPagamento.getMonth() + 1);
        proximoPagamento.setDate(1);
        const ultimoDiaMes = new Date(
          proximoPagamento.getFullYear(),
          proximoPagamento.getMonth() + 1,
          0
        ).getDate(); // Correção aqui
        proximoPagamento.setDate(Math.min(diaCadastro, ultimoDiaMes));
        if (proximoPagamento < today) {
          const valorDevido =
            item.type === "turma" ? prices.turmas : prices.escolinha;
          atrasados.push({
            nome: item.nome,
            tipo: item.type === "turma" ? "Turma" : "Aluno",
            valorDevido,
          });
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
        ).getDate(); // Correção aqui
        nextPaymentDate.setDate(Math.min(diaCadastro, ultimoDiaMes));
        if (nextPaymentDate < today) {
          const valorDevido =
            item.type === "turma" ? prices.turmas : prices.escolinha;
          atrasados.push({
            nome: item.nome,
            tipo: item.type === "turma" ? "Turma" : "Aluno",
            valorDevido,
          });
        }
      }
    });

    return atrasados.sort((a, b) => a.nome.localeCompare(b.nome));
  };

  useEffect(() => {
    fetchData();

    const unsubscribe = navigation.addListener("focus", () => {
      console.log("ReportsScreen: Tela em foco, recarregando dados...");
      fetchData();
    });

    return unsubscribe;
  }, [navigation]);

  const exportToCSV = async () => {
    try {
      const csvData = [
        "\ufeff",
        '"Relatório de Lucro Total"',
        '"Tipo de Serviço";"Valor (R$)"',
        `"Turmas";"${lucroTotal.turmas.toFixed(2)}"`,
        `"Escolinha";"${lucroTotal.escolinha.toFixed(2)}"`,
        `"Avulso";"${lucroTotal.avulso.toFixed(2)}"`,
        "",
        '"Lucro por Turma"',
        '"Turma";"Valor (R$)"',
        ...turmasLucro.map((t) => `"${t.nome}";"${t.total.toFixed(2)}"`),
        "",
        '"Lucro por Horário"',
        '"Horário";"Valor (R$)"',
        ...horariosLucro.map((h) => `"${h.horario}";"${h.total.toFixed(2)}"`),
        "",
        '"Dias Mais Cheios"',
        '"Dia";"Quantidade de Turmas"',
        ...diasCheios.map((d) => `"${d.dia}";"${d.count}"`),
        "",
        '"Turmas e Alunos em Atraso"',
        '"Nome";"Tipo";"Valor Devido (R$)"',
        ...atrasos.map(
          (a) => `"${a.nome}";"${a.tipo}";"${a.valorDevido.toFixed(2)}"`
        ),
      ].join("\n");

      const fileUri = `${FileSystem.documentDirectory}relatorios_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvData, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert(
          "Erro",
          "Compartilhamento não disponível neste dispositivo."
        );
      }
    } catch (error) {
      console.error("ReportsScreen: Erro ao exportar CSV:", error);
      Alert.alert(
        "Erro",
        "Não foi possível exportar o relatório: " + error.message
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relatórios</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lucro Total</Text>
        <Text style={styles.itemText}>
          Turmas: R$ {lucroTotal.turmas.toFixed(2)}
        </Text>
        <Text style={styles.itemText}>
          Escolinha: R$ {lucroTotal.escolinha.toFixed(2)}
        </Text>
        <Text style={styles.itemText}>
          Avulso: R$ {lucroTotal.avulso.toFixed(2)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lucro por Turma</Text>
        {turmasLucro.length > 0 ? (
          turmasLucro.map((turma, index) => (
            <Text key={index} style={styles.itemText}>
              {turma.nome}: R$ {turma.total.toFixed(2)}
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhuma turma registrada</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lucro por Horário</Text>
        {horariosLucro.length > 0 ? (
          horariosLucro.map((horario, index) => (
            <Text key={index} style={styles.itemText}>
              {horario.horario}: R$ {horario.total.toFixed(2)}
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhum horário registrado</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dias Mais Cheios</Text>
        {diasCheios.length > 0 ? (
          diasCheios.map((dia, index) => (
            <Text key={index} style={styles.itemText}>
              {dia.dia}: {dia.count} turmas
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhum dia registrado</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Turmas e Alunos em Atraso</Text>
        {atrasos.length > 0 ? (
          atrasos.map((item, index) => (
            <Text key={index} style={styles.itemText}>
              {item.nome} ({item.tipo}): R$ {item.valorDevido.toFixed(2)}
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhum atraso registrado</Text>
        )}
      </View>

      <TouchableOpacity style={styles.exportButton} onPress={exportToCSV}>
        <Text style={styles.exportButtonText}>Exportar para CSV</Text>
      </TouchableOpacity>
    </ScrollView>
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
  section: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
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
  },
  exportButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 20,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
