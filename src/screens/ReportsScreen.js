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
import {
  collection,
  query,
  getDocs,
  doc,
  onSnapshot,
  getDoc,
} from "firebase/firestore"; // Adicionei getDoc
import moment from "moment";

export default function ReportsScreen({ navigation, route }) {
  const [quantidadeAlunos, setQuantidadeAlunos] = useState(0);
  const [quantidadeMensalistas, setQuantidadeMensalistas] = useState(0);
  const [valorMensalAlunos, setValorMensalAlunos] = useState(0);
  const [valorMensalMensalistas, setValorMensalMensalistas] = useState(0);
  const [atrasos, setAtrasos] = useState([]);
  const [lucroTotal, setLucroTotal] = useState({
    anual: 0,
    mensal: 0,
    avulso: 0,
    primeiraReserva: null,
  });
  const [mediaMensalLucro, setMediaMensalLucro] = useState({
    anual: 0,
    mensal: 0,
    avulso: 0,
  });
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [horarioOperacao, setHorarioOperacao] = useState(null); // Estado inicial como null

  const fetchData = async () => {
    try {
      console.log("ReportsScreen: Iniciando fetchData");
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

      setQuantidadeAlunos(alunos.length);
      setQuantidadeMensalistas(turmas.length);
      setValorMensalAlunos(alunos.length * prices.escolinha);
      setValorMensalMensalistas(turmas.length * prices.turmas);

      const todosItens = [
        ...turmas.map((t) => ({ ...t, type: "turma" })),
        ...alunos.map((a) => ({ ...a, type: "aluno" })),
        ...reservas.map((r) => ({ ...r, type: "reserva" })),
      ];
      const atrasosData = calcularAtrasos(todosItens, payments, prices);
      setAtrasos(atrasosData);

      const lucroAnual = payments
        .filter((p) => p.tipoServico === "Escolinha")
        .reduce((sum, p) => sum + Math.max(p.valor, 0), 0);
      const lucroMensal = payments
        .filter((p) => p.tipoServico === "Turmas")
        .reduce((sum, p) => sum + Math.max(p.valor, 0), 0);
      const lucroAvulso = payments
        .filter((p) => p.tipoServico === "Avulso")
        .reduce((sum, p) => sum + Math.max(p.valor, 0), 0);

      const reservasOrdenadas = reservas.sort(
        (a, b) => moment(a.data).valueOf() - moment(b.data).valueOf()
      );
      const primeiraReserva = reservasOrdenadas.length
        ? moment(reservasOrdenadas[0].data).format("DD/MM/YYYY")
        : null;

      setLucroTotal({
        anual: lucroAnual,
        mensal: lucroMensal,
        avulso: lucroAvulso,
        primeiraReserva: primeiraReserva,
      });

      if (primeiraReserva) {
        const dataPrimeiraReserva = moment(reservasOrdenadas[0].data);
        const dataAtual = moment("2025-03-23");
        let mesesDiferenca = 0;
        let currentDate = dataPrimeiraReserva.clone().startOf("month");
        while (currentDate.isBefore(dataAtual.startOf("month"))) {
          mesesDiferenca++;
          currentDate.add(1, "month");
        }
        mesesDiferenca = Math.max(mesesDiferenca, 1);

        setMediaMensalLucro({
          anual: lucroAnual / mesesDiferenca,
          mensal: lucroMensal / mesesDiferenca,
          avulso: lucroAvulso / mesesDiferenca,
        });
      } else {
        setMediaMensalLucro({ anual: 0, mensal: 0, avulso: 0 });
      }

      console.log("ReportsScreen: fetchData concluído");
    } catch (error) {
      console.error("ReportsScreen: Erro ao carregar dados:", error);
      Alert.alert(
        "Erro",
        "Não foi possível carregar os dados para os relatórios."
      );
    }
  };

  const calcularHorariosDisponiveis = (
    turmas,
    alunos,
    reservas,
    campos,
    prices
  ) => {
    console.log("ReportsScreen: Calculando horários disponíveis com:", {
      horarioOperacao,
    });
    if (!horarioOperacao) {
      console.log(
        "ReportsScreen: Horário de operação não carregado ainda, abortando cálculo."
      );
      return [];
    }

    const today = moment("2025-03-23");
    const startOfMonth = today.clone().startOf("month");
    const endOfMonth = today.clone().endOf("month");
    const horariosOcupados = {};

    turmas.forEach((turma) => {
      const diaSemana = turma.dia.toLowerCase().replace("-feira", "");
      let currentDate = startOfMonth.clone();
      while (currentDate.isSameOrBefore(endOfMonth)) {
        if (
          currentDate.format("dddd").toLowerCase().replace("-feira", "") ===
          diaSemana
        ) {
          const dateStr = currentDate.format("YYYY-MM-DD");
          const campoId = turma.campoId;
          if (!horariosOcupados[dateStr]) horariosOcupados[dateStr] = {};
          if (!horariosOcupados[dateStr][campoId])
            horariosOcupados[dateStr][campoId] = [];
          horariosOcupados[dateStr][campoId].push({
            inicio: turma.inicio,
            fim: turma.fim,
          });
        }
        currentDate.add(1, "day");
      }
    });

    reservas.forEach((reserva) => {
      const dataInicial = moment(reserva.data);
      const campoId = reserva.campoId;
      if (reserva.tipo === "mensal") {
        const diaSemana = dataInicial.day();
        let currentDate = startOfMonth.clone();
        while (currentDate.isSameOrBefore(endOfMonth)) {
          if (
            currentDate.day() === diaSemana &&
            currentDate.isBetween(
              dataInicial,
              dataInicial.clone().add(1, "month"),
              null,
              "[]"
            )
          ) {
            const dateStr = currentDate.format("YYYY-MM-DD");
            if (!horariosOcupados[dateStr]) horariosOcupados[dateStr] = {};
            if (!horariosOcupados[dateStr][campoId])
              horariosOcupados[dateStr][campoId] = [];
            horariosOcupados[dateStr][campoId].push({
              inicio: reserva.horarioInicio,
              fim: reserva.horarioFim,
            });
          }
          currentDate.add(1, "day");
        }
      } else if (reserva.tipo === "avulso") {
        const dateStr = dataInicial.format("YYYY-MM-DD");
        if (dataInicial.isBetween(startOfMonth, endOfMonth, null, "[]")) {
          if (!horariosOcupados[dateStr]) horariosOcupados[dateStr] = {};
          if (!horariosOcupados[dateStr][campoId])
            horariosOcupados[dateStr][campoId] = [];
          horariosOcupados[dateStr][campoId].push({
            inicio: reserva.horarioInicio,
            fim: reserva.horarioFim,
          });
        }
      } else if (reserva.tipo === "anual") {
        const diaSemana = dataInicial.day();
        let currentDate = startOfMonth.clone();
        while (currentDate.isSameOrBefore(endOfMonth)) {
          if (
            currentDate.day() === diaSemana &&
            currentDate.isBetween(
              dataInicial,
              dataInicial.clone().add(12, "months"),
              null,
              "[]"
            )
          ) {
            const dateStr = currentDate.format("YYYY-MM-DD");
            if (!horariosOcupados[dateStr]) horariosOcupados[dateStr] = {};
            if (!horariosOcupados[dateStr][campoId])
              horariosOcupados[dateStr][campoId] = [];
            horariosOcupados[dateStr][campoId].push({
              inicio: reserva.horarioInicio,
              fim: reserva.horarioFim,
            });
          }
          currentDate.add(1, "day");
        }
      }
    });

    const horasTotaisDia = moment(horarioOperacao.fim, "HH:mm").diff(
      moment(horarioOperacao.inicio, "HH:mm"),
      "hours",
      true
    );
    console.log(
      "ReportsScreen: Horas totais por dia calculadas:",
      horasTotaisDia
    );

    const horariosDisponiveisData = [];
    let currentDate = startOfMonth.clone();
    while (currentDate.isSameOrBefore(endOfMonth)) {
      const dateStr = currentDate.format("YYYY-MM-DD");
      campos.forEach((campo) => {
        const horariosCampo = horariosOcupados[dateStr]?.[campo.id] || [];
        const diaSemana = currentDate.format("dddd");
        let horasDisponiveis = horasTotaisDia;
        horariosCampo.forEach((horario) => {
          const inicio = moment(horario.inicio, "HH:mm");
          const fim = moment(horario.fim, "HH:mm");
          const diffHoras = fim.diff(inicio, "hours", true);
          horasDisponiveis -= diffHoras;
        });
        if (horasDisponiveis > 0) {
          horariosDisponiveisData.push({
            data: dateStr,
            dia: diaSemana,
            campo: campo.nome,
            horas: horasDisponiveis.toFixed(1),
          });
        }
      });
      currentDate.add(1, "day");
    }

    console.log(
      "ReportsScreen: Horários disponíveis calculados:",
      horariosDisponiveisData
    );
    return horariosDisponiveisData.sort((a, b) => a.data.localeCompare(b.data));
  };

  const calcularAtrasos = (items, payments, prices) => {
    const atrasados = [];
    const today = new Date();

    items.forEach((item) => {
      const lastPayment = payments
        .filter((p) => p.itemId === item.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      const dataBase =
        item.type === "reserva" ? item.data : item.createdAt || new Date();
      const diaCadastro = new Date(dataBase).getDate();
      const valorDevido =
        item.type === "turma"
          ? prices.turmas
          : item.type === "aluno"
          ? prices.escolinha
          : item.type === "reserva" && item.tipo === "anual"
          ? prices.escolinha
          : item.type === "reserva" && item.tipo === "mensal"
          ? prices.turmas
          : prices.avulso;

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
        if (proximoPagamento < today) {
          atrasados.push({
            nome: item.nome,
            tipo:
              item.type === "turma"
                ? "Mensalista"
                : item.type === "aluno"
                ? "Aluno"
                : item.tipo === "anual"
                ? "Anual"
                : item.tipo === "mensal"
                ? "Mensal"
                : "Avulso",
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
            nome: item.nome,
            tipo:
              item.type === "turma"
                ? "Mensalista"
                : item.type === "aluno"
                ? "Aluno"
                : item.tipo === "anual"
                ? "Anual"
                : item.tipo === "mensal"
                ? "Mensal"
                : "Avulso",
            valorDevido,
          });
        }
      }
    });

    return atrasados.sort((a, b) => a.nome.localeCompare(b.nome));
  };

  // Carrega os dados iniciais e configura o listener do Firestore
  useEffect(() => {
    console.log("ReportsScreen: useEffect inicial iniciado");

    const loadInitialData = async () => {
      // Carrega o horário do Firestore imediatamente
      const horarioDocRef = doc(db, "configuracoes", "horarios");
      const horarioDoc = await getDoc(horarioDocRef);
      if (horarioDoc.exists()) {
        const { inicio, fim } = horarioDoc.data();
        console.log(
          "ReportsScreen: Horários carregados inicialmente do Firestore:",
          { inicio, fim }
        );
        setHorarioOperacao({ inicio, fim });
      } else {
        console.log(
          "ReportsScreen: Nenhum horário encontrado, usando padrão inicial."
        );
        setHorarioOperacao({ inicio: "09:00", fim: "22:00" }); // Padrão só se não houver nada no Firestore
      }

      await fetchData();
    };

    loadInitialData();

    const unsubscribeHorarios = onSnapshot(
      doc(db, "configuracoes", "horarios"),
      (docSnapshot) => {
        console.log("ReportsScreen: onSnapshot disparado");
        if (docSnapshot.exists()) {
          const { inicio, fim } = docSnapshot.data();
          console.log("ReportsScreen: Dados recebidos do Firestore:", {
            inicio,
            fim,
          });
          setHorarioOperacao({ inicio, fim });
        } else {
          console.log(
            "ReportsScreen: Nenhuma configuração encontrada, usando padrão."
          );
          setHorarioOperacao({ inicio: "09:00", fim: "22:00" });
        }
      },
      (error) => {
        console.error("ReportsScreen: Erro ao escutar horários:", error);
      }
    );

    const unsubscribeFocus = navigation.addListener("focus", () => {
      const shouldUpdate = route.params?.shouldUpdate || false;
      if (shouldUpdate) {
        console.log(
          "ReportsScreen: Foco detectado, atualizando dados com shouldUpdate..."
        );
        fetchData();
        navigation.setParams({ shouldUpdate: false });
      }
    });

    return () => {
      console.log("ReportsScreen: Limpando listeners");
      unsubscribeHorarios();
      unsubscribeFocus();
    };
  }, [navigation, route.params?.shouldUpdate]);

  // Recalcula os horários disponíveis quando horarioOperacao mudar
  useEffect(() => {
    if (!horarioOperacao) return; // Não recalcula até que o horário esteja carregado

    console.log("ReportsScreen: useEffect de recálculo disparado com:", {
      horarioOperacao,
    });
    const recalcularHorarios = async () => {
      try {
        console.log("ReportsScreen: Recalculando horários disponíveis");
        const turmas = await turmaService.getTurmas();
        const alunos = await alunoService.getAlunos();
        const reservas = (
          await getDocs(query(collection(db, "reservas")))
        ).docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const campos = await campoService.getCampos();
        const prices = await priceService.getPrices();
        const horarios = calcularHorariosDisponiveis(
          turmas,
          alunos,
          reservas,
          campos,
          prices
        );
        setHorariosDisponiveis(horarios);
        console.log(
          "ReportsScreen: Horários disponíveis atualizados:",
          horarios
        );
      } catch (error) {
        console.error(
          "ReportsScreen: Erro ao recalcular horários disponíveis:",
          error
        );
      }
    };
    recalcularHorarios();
  }, [horarioOperacao]);

  const exportToCSV = async () => {
    try {
      const csvData = [
        "\ufeff",
        '"Relatório Mensal"',
        '"Quantidade de Alunos";"Quantidade de Mensalistas"',
        `${quantidadeAlunos};${quantidadeMensalistas}`,
        "",
        '"Valor Mensal Total"',
        '"Alunos (Anual)";"Mensalistas"',
        `"${valorMensalAlunos.toFixed(2)}";"${valorMensalMensalistas.toFixed(
          2
        )}"`,
        "",
        '"Atrasados"',
        '"Nome";"Tipo";"Valor Devido (R$)"',
        ...atrasos.map(
          (a) => `"${a.nome}";"${a.tipo}";"${a.valorDevido.toFixed(2)}"`
        ),
        "",
        `"Lucro Total desde ${lucroTotal.primeiraReserva || "N/A"}"`,
        '"Anual";"Mensal";"Avulso"',
        `"${lucroTotal.anual.toFixed(2)}";"${lucroTotal.mensal.toFixed(
          2
        )}";"${lucroTotal.avulso.toFixed(2)}"`,
        "",
        '"Média Mensal de Lucro"',
        '"Anual";"Mensal";"Avulso"',
        `"${mediaMensalLucro.anual.toFixed(
          2
        )}";"${mediaMensalLucro.mensal.toFixed(
          2
        )}";"${mediaMensalLucro.avulso.toFixed(2)}"`,
        "",
        '"Horários Disponíveis no Mês"',
        '"Data";"Dia";"Campo";"Horas Disponíveis"',
        ...horariosDisponiveis.map(
          (h) => `"${h.data}";"${h.dia}";"${h.campo}";"${h.horas}"`
        ),
      ].join("\n");

      const fileUri = `${FileSystem.documentDirectory}relatorio_mensal_${
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
      Alert.alert("Erro", "Não foi possível exportar o relatório.");
    }
  };

  if (!horarioOperacao) {
    return (
      <View style={styles.container}>
        <Text>Carregando horários...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relatórios Mensais</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quantidades</Text>
        <Text style={styles.itemText}>Alunos (Anual): {quantidadeAlunos}</Text>
        <Text style={styles.itemText}>
          Mensalistas: {quantidadeMensalistas}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Valor Mensal Total</Text>
        <Text style={styles.itemText}>
          Alunos (Anual): R$ {valorMensalAlunos.toFixed(2)}
        </Text>
        <Text style={styles.itemText}>
          Mensalistas: R$ {valorMensalMensalistas.toFixed(2)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Atrasados</Text>
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
        <Text style={styles.sectionTitle}>
          Lucro Total desde {lucroTotal.primeiraReserva || "N/A"}
        </Text>
        <Text style={styles.itemText}>
          Anual: R$ {lucroTotal.anual.toFixed(2)}
        </Text>
        <Text style={styles.itemText}>
          Mensal: R$ {lucroTotal.mensal.toFixed(2)}
        </Text>
        <Text style={styles.itemText}>
          Avulso: R$ {lucroTotal.avulso.toFixed(2)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Média Mensal de Lucro</Text>
        <Text style={styles.itemText}>
          Anual: R$ {mediaMensalLucro.anual.toFixed(2)}
        </Text>
        <Text style={styles.itemText}>
          Mensal: R$ {mediaMensalLucro.mensal.toFixed(2)}
        </Text>
        <Text style={styles.itemText}>
          Avulso: R$ {mediaMensalLucro.avulso.toFixed(2)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Horários Disponíveis no Mês</Text>
        {horariosDisponiveis.length > 0 ? (
          horariosDisponiveis.map((h, index) => (
            <Text key={index} style={styles.itemText}>
              {h.data} ({h.dia}) - {h.campo}: {h.horas} horas
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>
            Nenhum horário disponível neste mês
          </Text>
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
