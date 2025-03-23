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
import { campoService } from "../services/campoService";
import { db } from "../services/firebaseService";
import { collection, query, getDocs } from "firebase/firestore";
import moment from "moment";

export default function ReportsScreen({ navigation }) {
  const [lucroTotal, setLucroTotal] = useState({
    turmas: 0,
    escolinha: 0,
    mensal: 0,
    avulso: 0,
  });
  const [turmasLucro, setTurmasLucro] = useState([]);
  const [horariosLucro, setHorariosLucro] = useState([]);
  const [diasCheios, setDiasCheios] = useState([]);
  const [atrasos, setAtrasos] = useState([]);
  const [mensalistas, setMensalistas] = useState([]);
  const [avulsos, setAvulsos] = useState([]);
  const [alugueisAtrasados, setAlugueisAtrasados] = useState([]);
  const [alugueisPagos, setAlugueisPagos] = useState([]);

  const fetchData = async () => {
    try {
      ("ReportsScreen: Iniciando busca de dados");
      const payments = await paymentService.getPayments();
      const turmas = await turmaService.getTurmas();
      const alunos = await alunoService.getAlunos();
      const prices = await priceService.getPrices();
      const campos = await campoService.getCampos();
      const reservasSnapshot = await getDocs(query(collection(db, "reservas")));
      const reservas = reservasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      "ReportsScreen: Reservas encontradas:", reservas.length;

      // Separar reservas por tipo
      const mensalistasData = reservas.filter((r) => r.tipo === "mensal");
      const avulsosData = reservas.filter((r) => r.tipo === "avulso");
      const anuaisData = reservas.filter((r) => r.tipo === "anual");

      "ReportsScreen: Mensalistas encontrados:", mensalistasData.length;
      "ReportsScreen: Avulsos encontrados:", avulsosData.length;
      "ReportsScreen: Anuais encontrados:", anuaisData.length;

      // Calcular lucro total
      const lucroPayments = payments.reduce(
        (acc, payment) => {
          const tipoServico = payment.tipoServico
            ? payment.tipoServico.toLowerCase()
            : "desconhecido";
          if (["turmas", "escolinha"].includes(tipoServico)) {
            acc[tipoServico] += payment.valor;
          } else if (tipoServico === "avulso") {
            acc.avulso += payment.valor;
          }
          return acc;
        },
        { turmas: 0, escolinha: 0, mensal: 0, avulso: 0 }
      );

      const lucroMensal = mensalistasData.reduce((sum, m) => {
        const lastPayment = payments
          .filter((p) => p.itemId === m.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        return lastPayment ? sum + prices.turmas : sum;
      }, 0);
      lucroPayments.mensal = lucroMensal;

      const lucroAvulso = payments
        .filter((p) => p.tipoServico === "Avulso")
        .reduce((sum, p) => sum + p.valor, 0);
      lucroPayments.avulso = lucroAvulso;

      setLucroTotal(lucroPayments);

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

      // Dados dos aluguéis mensais
      const mensalistasFormatted = mensalistasData.map((m) => ({
        nome: m.nome,
        dataInicio: moment(m.data).format("DD/MM/YYYY"),
        dataFim: moment(m.data).add(1, "month").format("DD/MM/YYYY"),
        campo: campos.find((c) => c.id === m.campoId)?.nome || "Desconhecido",
        horario: `${m.horarioInicio} - ${m.horarioFim}`,
        ganho: prices.turmas || 0,
      }));
      setMensalistas(mensalistasFormatted);

      // Dados dos aluguéis avulsos
      const avulsosFormatted = avulsosData.map((a) => ({
        nome: a.nome,
        data: moment(a.data).format("DD/MM/YYYY"),
        campo: campos.find((c) => c.id === a.campoId)?.nome || "Desconhecido",
        horario: `${a.horarioInicio} - ${a.horarioFim}`,
        ganho: prices.avulso || 0,
      }));
      setAvulsos(avulsosFormatted);

      // Aluguéis Atrasados e Pagos
      const todasReservas = [
        ...mensalistasData.map((r) => ({ ...r, type: "reserva" })),
        ...avulsosData.map((r) => ({ ...r, type: "reserva" })),
        ...anuaisData.map((r) => ({ ...r, type: "reserva" })),
      ];
      const { atrasados, pagos } = calcularStatusAlugueis(
        todasReservas,
        payments,
        prices,
        campos
      );
      setAlugueisAtrasados(atrasados);
      setAlugueisPagos(pagos);
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
        ).getDate();
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
        ).getDate();
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

  const calcularStatusAlugueis = (reservas, payments, prices, campos) => {
    const atrasados = [];
    const pagos = [];
    const today = new Date();

    reservas.forEach((reserva) => {
      const lastPayment = payments
        .filter((p) => p.itemId === reserva.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      const diaCadastro = new Date(reserva.data).getDate();
      const valorDevido =
        reserva.tipo === "anual"
          ? prices.escolinha
          : reserva.tipo === "mensal"
          ? prices.turmas
          : prices.avulso;

      const campoNome =
        campos.find((c) => c.id === reserva.campoId)?.nome || "Desconhecido";

      if (!lastPayment) {
        const dataCriacao = new Date(reserva.data);
        const proximoPagamento = new Date(dataCriacao);
        proximoPagamento.setMonth(proximoPagamento.getMonth() + 1);
        proximoPagamento.setDate(1);
        const ultimoDiaMes = new Date(
          proximoPagamento.getFullYear(),
          proximoPagamento.getMonth() + 1,
          0
        ).getDate();
        proximoPagamento.setDate(Math.min(diaCadastro, ultimoDiaMes));
        if (proximoPagamento < today) {
          atrasados.push({
            nome: reserva.nome,
            tipo: reserva.tipo,
            data: moment(reserva.data).format("DD/MM/YYYY"),
            horario: `${reserva.horarioInicio} - ${reserva.horarioFim}`,
            campo: campoNome,
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
        ).getDate();
        nextPaymentDate.setDate(Math.min(diaCadastro, ultimoDiaMes));
        if (nextPaymentDate < today) {
          atrasados.push({
            nome: reserva.nome,
            tipo: reserva.tipo,
            data: moment(reserva.data).format("DD/MM/YYYY"),
            horario: `${reserva.horarioInicio} - ${reserva.horarioFim}`,
            campo: campoNome,
            valorDevido,
          });
        } else {
          pagos.push({
            nome: reserva.nome,
            tipo: reserva.tipo,
            data: moment(reserva.data).format("DD/MM/YYYY"),
            horario: `${reserva.horarioInicio} - ${reserva.horarioFim}`,
            campo: campoNome,
            valorPago: lastPayment.valor,
            dataPagamento: moment(lastPayment.createdAt).format("DD/MM/YYYY"),
          });
        }
      }
    });

    return {
      atrasados: atrasados.sort((a, b) => a.nome.localeCompare(b.nome)),
      pagos: pagos.sort((a, b) => a.nome.localeCompare(b.nome)),
    };
  };

  useEffect(() => {
    fetchData();

    const unsubscribe = navigation.addListener("focus", () => {
      ("ReportsScreen: Tela em foco, recarregando dados...");
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
        `"Mensalistas";"${lucroTotal.mensal.toFixed(2)}"`,
        `"Avulsos";"${lucroTotal.avulso.toFixed(2)}"`,
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
        "",
        '"Aluguéis Mensais"',
        '"Nome";"Data Início";"Data Fim";"Campo";"Horário";"Ganho (R$)"',
        ...mensalistas.map(
          (m) =>
            `"${m.nome}";"${m.dataInicio}";"${m.dataFim}";"${m.campo}";"${
              m.horario
            }";"${m.ganho.toFixed(2)}"`
        ),
        "",
        '"Aluguéis Avulsos"',
        '"Nome";"Data";"Campo";"Horário";"Ganho (R$)"',
        ...avulsos.map(
          (a) =>
            `"${a.nome}";"${a.data}";"${a.campo}";"${
              a.horario
            }";"${a.ganho.toFixed(2)}"`
        ),
        "",
        '"Aluguéis Atrasados"',
        '"Nome";"Tipo";"Data";"Horário";"Campo";"Valor Devido (R$)"',
        ...alugueisAtrasados.map(
          (a) =>
            `"${a.nome}";"${a.tipo}";"${a.data}";"${a.horario}";"${
              a.campo
            }";"${a.valorDevido.toFixed(2)}"`
        ),
        "",
        '"Aluguéis Pagos"',
        '"Nome";"Tipo";"Data";"Horário";"Campo";"Valor Pago (R$)";"Data Pagamento"',
        ...alugueisPagos.map(
          (p) =>
            `"${p.nome}";"${p.tipo}";"${p.data}";"${p.horario}";"${
              p.campo
            }";"${p.valorPago.toFixed(2)}";"${p.dataPagamento}"`
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
          Mensalistas: R$ {lucroTotal.mensal.toFixed(2)}
        </Text>
        <Text style={styles.itemText}>
          Avulsos: R$ {lucroTotal.avulso.toFixed(2)}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aluguéis Mensais</Text>
        {mensalistas.length > 0 ? (
          mensalistas.map((m, index) => (
            <Text key={index} style={styles.itemText}>
              {m.nome}: {m.dataInicio} a {m.dataFim}, {m.campo}, {m.horario} -
              R$ {m.ganho.toFixed(2)}
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhum aluguel mensal registrado</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aluguéis Avulsos</Text>
        {avulsos.length > 0 ? (
          avulsos.map((a, index) => (
            <Text key={index} style={styles.itemText}>
              {a.nome}: {a.data}, {a.campo}, {a.horario} - R${" "}
              {a.ganho.toFixed(2)}
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhum aluguel avulso registrado</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aluguéis Atrasados</Text>
        {alugueisAtrasados.length > 0 ? (
          alugueisAtrasados.map((a, index) => (
            <Text key={index} style={styles.itemText}>
              {a.nome} ({a.tipo}): {a.data}, {a.horario}, {a.campo} - R${" "}
              {a.valorDevido.toFixed(2)}
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhum aluguel atrasado</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aluguéis Pagos</Text>
        {alugueisPagos.length > 0 ? (
          alugueisPagos.map((p, index) => (
            <Text key={index} style={styles.itemText}>
              {p.nome} ({p.tipo}): {p.data}, {p.horario}, {p.campo} - R${" "}
              {p.valorPago.toFixed(2)} (Pago em {p.dataPagamento})
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhum aluguel pago</Text>
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
