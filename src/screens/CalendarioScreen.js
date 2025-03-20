import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import moment from "moment";
import { turmaService } from "../services/turmaService";
import { db } from "../services/firebaseService";
import { collection, addDoc } from "firebase/firestore";

LocaleConfig.locales["pt"] = {
  monthNames: [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ],
  monthNamesShort: [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ],
  dayNames: [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ],
  dayNamesShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
};
LocaleConfig.defaultLocale = "pt";

export default function CalendarioScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(
    moment().format("YYYY-MM-DD")
  );
  const [reservas, setReservas] = useState({});

  // Função para cadastrar uma reserva mensal
  const cadastrarReservaMensal = async (
    diaSemana,
    horarioInicio,
    horarioFim,
    turma,
    campoId
  ) => {
    const mesAtual = moment().month();
    const anoAtual = moment().year();
    const diasDoMes = moment(
      `${anoAtual}-${mesAtual + 1}`,
      "YYYY-MM"
    ).daysInMonth();

    for (let dia = 1; dia <= diasDoMes; dia++) {
      const data = moment(`${anoAtual}-${mesAtual + 1}-${dia}`, "YYYY-MM-DD");
      if (data.day() === diaSemana) {
        // Verifica se é o dia da semana correto
        const dataFormatada = data.format("YYYY-MM-DD");
        const reserva = {
          data: dataFormatada,
          horarioInicio,
          horarioFim,
          nome: turma.nome,
          tipo: "mensal",
          campoId,
        };
        await salvarReservaNoFirestore(reserva);
      }
    }
  };

  const salvarReservaNoFirestore = async (reserva) => {
    try {
      const reservasRef = collection(db, "reservas");
      await addDoc(reservasRef, reserva);
      console.log("Reserva salva no Firestore:", reserva);
    } catch (error) {
      console.error("Erro ao salvar reserva no Firestore:", error);
    }
  };

  // Função para cadastrar uma reserva avulsa
  const cadastrarReservaAvulsa = async (
    data,
    horarioInicio,
    horarioFim,
    turma,
    campoId
  ) => {
    const dataFormatada = moment(data).format("YYYY-MM-DD");
    const reserva = {
      data: dataFormatada,
      horarioInicio,
      horarioFim,
      nome: turma.nome,
      tipo: "avulsa",
      campoId,
    };
    await salvarReservaNoFirestore(reserva);
  };

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={reservas}
        markingType="multi-dot"
        theme={{
          calendarBackground: "#fff",
          selectedDayBackgroundColor: "#007AFF",
          selectedDayTextColor: "#fff",
          todayTextColor: "#007AFF",
          dotColor: "#007AFF",
          selectedDotColor: "#fff",
        }}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          cadastrarReservaMensal(
            1, // Segunda-feira (0 = domingo, 1 = segunda, etc.)
            "14:00",
            "15:30",
            { nome: "Turma de Futebol", responsavel: "João" }
          )
        }
      >
        <Text style={styles.buttonText}>Cadastrar Reserva Mensal</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          cadastrarReservaAvulsa("2023-11-12", "10:00", "11:30", {
            nome: "Reserva Avulsa",
            responsavel: "Maria",
          })
        }
      >
        <Text style={styles.buttonText}>Cadastrar Reserva Avulsa</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
