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

  const fetchData = async () => {
    try {
      const payments = await paymentService.getPayments();
      const turmas = await turmaService.getTurmas();
      const prices = await priceService.getPrices();

      const lucro = payments.reduce(
        (acc, payment) => {
          acc[payment.tipoServico.toLowerCase()] += payment.valor;
          return acc;
        },
        { turmas: 0, escolinha: 0, avulso: 0 }
      );
      setLucroTotal(lucro);

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

      const diasCheiosData = turmas.reduce((acc, turma) => {
        acc[turma.dia] = (acc[turma.dia] || 0) + 1;
        return acc;
      }, {});
      const diasArray = Object.entries(diasCheiosData)
        .map(([dia, count]) => ({ dia, count }))
        .sort((a, b) => b.count - a.count);
      setDiasCheios(diasArray);
    } catch (error) {
      console.error("ReportsScreen: Erro ao carregar dados:", error);
      Alert.alert(
        "Erro",
        "Não foi possível carregar os dados para os relatórios."
      );
    }
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
      // Adiciona o BOM (\ufeff) para UTF-8 e usa ; como separador
      const csvData = [
        "\ufeff", // BOM para Excel reconhecer UTF-8
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
