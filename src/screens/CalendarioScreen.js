// src/screens/CalendarioScreen.js
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Picker } from "@react-native-picker/picker";
import moment from "moment";
import { campoService } from "../services/campoService";

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
  const [campos, setCampos] = useState([]);
  const [selectedCampoId, setSelectedCampoId] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Novo estado para controle de carregamento

  useEffect(() => {
    const fetchCampos = async () => {
      console.log("CalendarioScreen: Iniciando busca de campos");
      try {
        const camposData = await campoService.getCampos();
        console.log("CalendarioScreen: Campos recebidos:", camposData);
        setCampos(camposData);
        if (camposData.length > 0) {
          console.log(
            "CalendarioScreen: Definindo campo padrão:",
            camposData[0].id
          );
          setSelectedCampoId(camposData[0].id);
        } else {
          console.log("CalendarioScreen: Nenhum campo encontrado");
        }
      } catch (error) {
        console.error("CalendarioScreen: Erro ao buscar campos:", error);
      } finally {
        console.log("CalendarioScreen: Finalizando busca de campos");
        setIsLoading(false); // Marca como concluído, mesmo com erro
      }
    };
    fetchCampos();
  }, []);

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    if (!selectedCampoId) {
      alert("Por favor, selecione um campo antes de continuar!");
      return;
    }
    console.log(
      "CalendarioScreen: Navegando para AddTurma com data:",
      day.dateString,
      "e campoId:",
      selectedCampoId
    );
    navigation.navigate("HomeStack", {
      screen: "AddTurma",
      params: {
        data: day.dateString,
        mode: "escolinha",
        campoId: selectedCampoId,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Selecione um Campo:</Text>
      <Picker
        selectedValue={selectedCampoId}
        onValueChange={(itemValue) => {
          console.log("CalendarioScreen: Campo selecionado:", itemValue);
          setSelectedCampoId(itemValue);
        }}
        style={styles.picker}
      >
        {isLoading ? (
          <Picker.Item label="Carregando campos..." value="" />
        ) : campos.length === 0 ? (
          <Picker.Item label="Nenhum campo disponível" value="" />
        ) : (
          campos.map((campo) => (
            <Picker.Item
              key={campo.id}
              label={campo.nome || "Campo sem nome"}
              value={campo.id}
            />
          ))
        )}
      </Picker>
      {campos.length === 0 && !isLoading && (
        <Text style={styles.noCamposText}>
          Nenhum campo disponível ou erro ao carregar.
        </Text>
      )}
      <Calendar
        current={selectedDate}
        onDayPress={handleDayPress}
        markedDates={{
          ...reservas,
          [selectedDate]: { selected: true, selectedColor: "#007AFF" },
        }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  picker: {
    height: 50,
    width: "100%",
    marginBottom: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  noCamposText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 10,
    textAlign: "center",
  },
});
