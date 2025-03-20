// src/screens/CalendarioScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Picker } from "@react-native-picker/picker";
import moment from "moment";
import "moment/locale/pt-br";
import { campoService } from "../services/campoService";
import { turmaService } from "../services/turmaService";
import { escolinhaService } from "../services/escolinhaService";
import { db } from "../services/firebaseService";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

moment.locale("pt-br");

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
  const [reservas, setReservas] = useState([]);
  const [campos, setCampos] = useState([]);
  const [selectedCampoId, setSelectedCampoId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [reservasDoDia, setReservasDoDia] = useState([]);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editHorarioInicio, setEditHorarioInicio] = useState("");
  const [editHorarioFim, setEditHorarioFim] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      console.log("CalendarioScreen: Iniciando busca de dados");
      try {
        const camposData = await campoService.getCampos();
        console.log("CalendarioScreen: Campos recebidos:", camposData);
        setCampos(camposData);
        if (camposData.length > 0) {
          setSelectedCampoId(camposData[0].id);
        }

        const reservasData = await fetchReservas();
        setReservas(reservasData);
      } catch (error) {
        console.error("CalendarioScreen: Erro ao buscar dados:", error);
      } finally {
        setIsLoading(false);
        console.log("CalendarioScreen: Finalizando busca de dados");
      }
    };
    fetchData();

    const unsubscribe = navigation.addListener("focus", () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (selectedCampoId && reservas.length > 0) {
      updateMarkedDates(reservas, selectedDate);
    }
  }, [selectedCampoId, reservas, selectedDate]);

  const fetchReservas = async () => {
    try {
      const reservasRef = collection(db, "reservas");
      const q = query(reservasRef);
      const querySnapshot = await getDocs(q);
      const reservasData = [];
      querySnapshot.forEach((doc) => {
        reservasData.push({ id: doc.id, ...doc.data() });
      });
      console.log("CalendarioScreen: Reservas carregadas:", reservasData);
      return reservasData;
    } catch (error) {
      console.error("Erro ao buscar reservas do Firestore:", error);
      return [];
    }
  };

  const updateMarkedDates = (reservasData, selected) => {
    const marked = {};
    reservasData
      .filter((reserva) => reserva.campoId === selectedCampoId)
      .forEach((reserva) => {
        const dataInicial = moment(reserva.data);
        if (reserva.tipo === "mensal") {
          const diaSemana = dataInicial.day();
          const startOfPeriod = dataInicial.clone().startOf("day");
          const endOfPeriod = dataInicial.clone().add(30, "days");
          let currentDate = startOfPeriod.clone();

          while (currentDate <= endOfPeriod) {
            if (currentDate.day() === diaSemana) {
              const dateStr = currentDate.format("YYYY-MM-DD");
              marked[dateStr] = {
                marked: true,
                dotColor: "#FF0000",
              };
            }
            currentDate.add(1, "week");
          }
        } else {
          const dateStr = dataInicial.format("YYYY-MM-DD");
          marked[dateStr] = {
            marked: true,
            dotColor: "#FF0000",
          };
        }
      });

    marked[selected] = {
      selected: true,
      selectedColor: "#007AFF",
      dotColor: "#FF0000",
      ...(marked[selected] || {}),
    };

    setMarkedDates(marked);
    console.log("CalendarioScreen: Datas marcadas atualizadas:", marked);
  };

  const fetchReservasDoDia = async (date) => {
    try {
      const diaSemana = moment(date)
        .format("dddd")
        .toLowerCase()
        .replace("-feira", "");
      const turmas = await turmaService.getTurmas();
      const aulas = await escolinhaService.getAulas();
      const reservasFirestore = reservas.filter((reserva) => {
        const reservaDate = moment(reserva.data);
        const isSameDate = reservaDate.format("YYYY-MM-DD") === date;
        const isMensal =
          reserva.tipo === "mensal" && reservaDate.day() === moment(date).day();
        return isSameDate || isMensal;
      });

      const reservasDia = [
        ...turmas.filter(
          (t) => t.dia === diaSemana && t.campoId === selectedCampoId
        ),
        ...aulas.filter(
          (a) => a.dia === diaSemana && a.campoId === selectedCampoId
        ),
        ...reservasFirestore.filter((r) => r.campoId === selectedCampoId),
      ].sort((a, b) =>
        (a.inicio || a.horarioInicio).localeCompare(b.inicio || b.horarioInicio)
      );

      console.log("CalendarioScreen: Reservas do dia", date, ":", reservasDia);
      return reservasDia;
    } catch (error) {
      console.error("Erro ao buscar reservas do dia:", error);
      return [];
    }
  };

  const handleDayPress = async (day) => {
    const date = day.dateString;
    setSelectedDate(date);
    if (!selectedCampoId) {
      alert("Por favor, selecione um campo antes de continuar!");
      return;
    }

    const reservasDia = await fetchReservasDoDia(date);
    setReservasDoDia(reservasDia);
    setModalVisible(true);
  };

  const handleEditReserva = (reserva) => {
    setSelectedReserva(reserva);
    setEditNome(reserva.nome);
    setEditResponsavel(reserva.responsavel);
    setEditTelefone(reserva.telefone);
    setEditHorarioInicio(reserva.inicio || reserva.horarioInicio);
    setEditHorarioFim(reserva.fim || reserva.horarioFim);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (
      !editNome ||
      !editResponsavel ||
      !editTelefone ||
      !editHorarioInicio ||
      !editHorarioFim
    ) {
      Alert.alert("Erro", "Preencha todos os campos!");
      return;
    }

    try {
      const reservaRef = doc(db, "reservas", selectedReserva.id);
      const updatedReserva = {
        nome: editNome,
        responsavel: editResponsavel,
        telefone: editTelefone,
        horarioInicio: editHorarioInicio,
        horarioFim: editHorarioFim,
        data: selectedReserva.data,
        tipo: selectedReserva.tipo,
        campoId: selectedReserva.campoId,
      };

      await updateDoc(reservaRef, updatedReserva);
      console.log("CalendarioScreen: Reserva atualizada:", updatedReserva);

      const updatedReservas = reservas.map((r) =>
        r.id === selectedReserva.id ? { ...r, ...updatedReserva } : r
      );
      setReservas(updatedReservas);
      const updatedReservasDia = await fetchReservasDoDia(selectedDate);
      setReservasDoDia(updatedReservasDia);
      updateMarkedDates(updatedReservas, selectedDate);

      setEditModalVisible(false);
    } catch (error) {
      console.error("Erro ao atualizar reserva:", error);
      Alert.alert("Erro", "Não foi possível atualizar a reserva.");
    }
  };

  const handleCancelReserva = async (reservaId) => {
    Alert.alert(
      "Confirmar Cancelamento",
      "Tem certeza que deseja cancelar esta reserva?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim",
          onPress: async () => {
            try {
              const reservaRef = doc(db, "reservas", reservaId);
              await deleteDoc(reservaRef);
              console.log("CalendarioScreen: Reserva cancelada:", reservaId);

              const updatedReservas = reservas.filter(
                (r) => r.id !== reservaId
              );
              setReservas(updatedReservas);
              const updatedReservasDia = await fetchReservasDoDia(selectedDate);
              setReservasDoDia(updatedReservasDia);
              updateMarkedDates(updatedReservas, selectedDate);
            } catch (error) {
              console.error("Erro ao cancelar reserva:", error);
              Alert.alert("Erro", "Não foi possível cancelar a reserva.");
            }
          },
        },
      ]
    );
  };

  const handleAddReserva = () => {
    setModalVisible(false);
    console.log(
      "CalendarioScreen: Navegando para AddTurma com data:",
      selectedDate,
      "e campoId:",
      selectedCampoId
    );
    navigation.navigate("HomeStack", {
      screen: "AddTurma",
      params: {
        data: selectedDate,
        mode: "escolinha",
        campoId: selectedCampoId,
      },
    });
  };

  const renderReservaItem = ({ item }) => (
    <TouchableOpacity
      style={styles.reservaItem}
      onPress={() => item.id && handleEditReserva(item)} // Só editável se tiver ID (reservas do Firestore)
    >
      <Text style={styles.reservaText}>
        {item.inicio || item.horarioInicio} - {item.fim || item.horarioFim}
      </Text>
      <Text style={styles.reservaText}>Nome: {item.nome}</Text>
      <Text style={styles.reservaText}>Responsável: {item.responsavel}</Text>
      <Text style={styles.reservaText}>Telefone: {item.telefone}</Text>
      {item.id && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelReserva(item.id)}
        >
          <Text style={styles.cancelButtonText}>Cancelar Reserva</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

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
        markedDates={markedDates}
        markingType="dot"
        theme={{
          calendarBackground: "#fff",
          selectedDayBackgroundColor: "#007AFF",
          selectedDayTextColor: "#fff",
          todayTextColor: "#007AFF",
          dotColor: "#FF0000",
          selectedDotColor: "#fff",
        }}
      />
      {/* Modal de Reservas do Dia */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Reservas do dia {moment(selectedDate).format("DD/MM/YYYY")}
            </Text>
            {reservasDoDia.length > 0 ? (
              <FlatList
                data={reservasDoDia}
                renderItem={renderReservaItem}
                keyExtractor={(item) =>
                  item.id || `${item.nome}-${item.horarioInicio}`
                }
                style={styles.reservaList}
              />
            ) : (
              <Text style={styles.noReservasText}>
                Nenhuma reserva neste dia
              </Text>
            )}
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddReserva}
            >
              <Text style={styles.addButtonText}>Adicionar Reserva</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Modal de Edição */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Reserva</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={editNome}
              onChangeText={setEditNome}
            />
            <TextInput
              style={styles.input}
              placeholder="Responsável"
              value={editResponsavel}
              onChangeText={setEditResponsavel}
            />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              value={editTelefone}
              onChangeText={setEditTelefone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Horário Início (ex.: 17:00)"
              value={editHorarioInicio}
              onChangeText={setEditHorarioInicio}
            />
            <TextInput
              style={styles.input}
              placeholder="Horário Fim (ex.: 18:00)"
              value={editHorarioFim}
              onChangeText={setEditHorarioFim}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveEdit}
            >
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  reservaList: {
    maxHeight: 300,
    width: "100%",
  },
  reservaItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  reservaText: {
    fontSize: 14,
    color: "#333",
  },
  noReservasText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#FF0000",
    padding: 8,
    borderRadius: 5,
    marginTop: 5,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  closeButton: {
    backgroundColor: "#FF0000",
    padding: 10,
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: "100%",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
