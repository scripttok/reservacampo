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
  addDoc,
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
  const [addAvulsoModalVisible, setAddAvulsoModalVisible] = useState(false);
  const [addRentalModalVisible, setAddRentalModalVisible] = useState(false);
  const [reservasDoDia, setReservasDoDia] = useState([]);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editHorarioInicio, setEditHorarioInicio] = useState("");
  const [editHorarioFim, setEditHorarioFim] = useState("");
  const [avulsoNome, setAvulsoNome] = useState("");
  const [avulsoResponsavel, setAvulsoResponsavel] = useState("");
  const [avulsoTelefone, setAvulsoTelefone] = useState("");
  const [avulsoHorarioInicio, setAvulsoHorarioInicio] = useState("");
  const [avulsoHorarioFim, setAvulsoHorarioFim] = useState("");
  const [rentalNome, setRentalNome] = useState("");
  const [rentalResponsavel, setRentalResponsavel] = useState("");
  const [rentalTelefone, setRentalTelefone] = useState("");
  const [rentalHorarioInicio, setRentalHorarioInicio] = useState("");
  const [rentalHorarioFim, setRentalHorarioFim] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRentalDates, setSelectedRentalDates] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      console.log("CalendarioScreen: Iniciando busca de dados");
      try {
        const camposData = await campoService.getCampos();
        setCampos(camposData);
        if (camposData.length > 0) setSelectedCampoId(camposData[0].id);
        const reservasData = await fetchReservas();
        setReservas(reservasData);
      } catch (error) {
        console.error("CalendarioScreen: Erro ao buscar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    const unsubscribe = navigation.addListener("focus", fetchData);
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
      return reservasData;
    } catch (error) {
      console.error("Erro ao buscar reservas do Firestore:", error);
      return [];
    }
  };

  const updateMarkedDates = (
    reservasData,
    selected,
    rentalDates = selectedRentalDates
  ) => {
    const marked = {};
    reservasData
      .filter((reserva) => reserva.campoId === selectedCampoId)
      .forEach((reserva) => {
        const dataInicial = moment(reserva.data);
        const dateStr = dataInicial.format("YYYY-MM-DD");
        if (reserva.tipo === "mensal") {
          const diaSemana = dataInicial.day();
          const startOfPeriod = dataInicial.clone().startOf("day");
          const endOfPeriod = dataInicial
            .clone()
            .add(1, "month")
            .startOf("day");
          let currentDate = startOfPeriod.clone();
          while (currentDate.isSameOrBefore(endOfPeriod)) {
            if (currentDate.day() === diaSemana) {
              const mensalDateStr = currentDate.format("YYYY-MM-DD");
              marked[mensalDateStr] = {
                selected: true,
                selectedColor: "#28A745",
              };
            }
            currentDate.add(1, "week");
          }
        } else if (reserva.tipo === "avulso") {
          marked[dateStr] = { selected: true, selectedColor: "#FFA500" };
        }
      });

    Object.keys(rentalDates).forEach((date) => {
      marked[date] = {
        ...marked[date],
        selected: true,
        selectedColor: "#00FF00",
      };
    });

    marked[selected] = {
      ...marked[selected],
      selected: true,
      selectedColor: "#007AFF",
    };
    setMarkedDates(marked);
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
          reserva.tipo === "mensal" &&
          reservaDate.day() === moment(date).day() &&
          moment(date).isBetween(
            reservaDate,
            reservaDate.clone().add(1, "month"),
            null,
            "[]"
          );
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
      return reservasDia;
    } catch (error) {
      console.error("Erro ao buscar reservas do dia:", error);
      return [];
    }
  };

  const hasTimeConflict = (
    inicio,
    fim,
    reservasExistentes,
    reservaId = null
  ) => {
    const newStart = moment(inicio, "HH:mm");
    const newEnd = moment(fim, "HH:mm");
    return reservasExistentes.some((reserva) => {
      if (reservaId && reserva.id === reservaId) return false;
      const existingStart = moment(
        reserva.inicio || reserva.horarioInicio,
        "HH:mm"
      );
      const existingEnd = moment(reserva.fim || reserva.horarioFim, "HH:mm");
      return newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
    });
  };

  const handleDayPress = (day) => {
    const date = day.dateString;
    if (selectionMode) {
      const newSelectedDates = { ...selectedRentalDates };
      if (newSelectedDates[date]) {
        delete newSelectedDates[date];
      } else {
        newSelectedDates[date] = true;
      }
      setSelectedRentalDates(newSelectedDates);
      setMarkedDates((prev) => ({
        ...prev,
        [date]: newSelectedDates[date]
          ? { ...prev[date], selected: true, selectedColor: "#00FF00" }
          : { ...prev[date], selected: false },
      }));
    } else {
      setSelectedDate(date);
      if (!selectedCampoId) {
        alert("Por favor, selecione um campo antes de continuar!");
        return;
      }
      fetchReservasDoDia(date)
        .then(setReservasDoDia)
        .then(() => setModalVisible(true));
    }
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
    if (
      !moment(editHorarioInicio, "HH:mm", true).isValid() ||
      !moment(editHorarioFim, "HH:mm", true).isValid()
    ) {
      Alert.alert(
        "Erro",
        "Horários devem estar no formato HH:mm (ex.: 17:00)!"
      );
      return;
    }
    const reservasDia = await fetchReservasDoDia(selectedDate);
    if (
      hasTimeConflict(
        editHorarioInicio,
        editHorarioFim,
        reservasDia,
        selectedReserva.id
      )
    ) {
      Alert.alert(
        "Erro",
        "Conflito de horário! Já existe uma reserva nesse intervalo."
      );
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
      const updatedReservas = reservas.map((r) =>
        r.id === selectedReserva.id ? { ...r, ...updatedReserva } : r
      );
      setReservas(updatedReservas);
      setReservasDoDia(await fetchReservasDoDia(selectedDate));
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
              const updatedReservas = reservas.filter(
                (r) => r.id !== reservaId
              );
              setReservas(updatedReservas);
              setReservasDoDia(await fetchReservasDoDia(selectedDate));
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

  const handleAddReservaMensal = async () => {
    const reservasDia = await fetchReservasDoDia(selectedDate);
    setModalVisible(false);
    navigation.navigate("HomeStack", {
      screen: "AddTurma",
      params: {
        data: selectedDate,
        mode: "escolinha",
        campoId: selectedCampoId,
        reservasExistentes: reservasDia,
      },
    });
  };

  const handleAddAvulso = () => {
    setAvulsoNome("");
    setAvulsoResponsavel("");
    setAvulsoTelefone("");
    setAvulsoHorarioInicio("");
    setAvulsoHorarioFim("");
    setAddAvulsoModalVisible(true);
  };

  const handleSaveAvulso = async () => {
    if (
      !avulsoNome ||
      !avulsoResponsavel ||
      !avulsoTelefone ||
      !avulsoHorarioInicio ||
      !avulsoHorarioFim
    ) {
      Alert.alert("Erro", "Preencha todos os campos!");
      return;
    }
    if (
      !moment(avulsoHorarioInicio, "HH:mm", true).isValid() ||
      !moment(avulsoHorarioFim, "HH:mm", true).isValid()
    ) {
      Alert.alert(
        "Erro",
        "Horários devem estar no formato HH:mm (ex.: 17:00)!"
      );
      return;
    }
    const reservasDia = await fetchReservasDoDia(selectedDate);
    if (hasTimeConflict(avulsoHorarioInicio, avulsoHorarioFim, reservasDia)) {
      Alert.alert(
        "Erro",
        "Conflito de horário! Já existe uma reserva nesse intervalo."
      );
      return;
    }

    try {
      const reserva = {
        data: selectedDate,
        horarioInicio: avulsoHorarioInicio,
        horarioFim: avulsoHorarioFim,
        nome: avulsoNome,
        responsavel: avulsoResponsavel,
        telefone: avulsoTelefone,
        campoId: selectedCampoId,
        tipo: "avulso",
      };
      const docRef = await addDoc(collection(db, "reservas"), reserva);
      const updatedReservas = [...reservas, { id: docRef.id, ...reserva }];
      setReservas(updatedReservas);
      setReservasDoDia(await fetchReservasDoDia(selectedDate));
      updateMarkedDates(updatedReservas, selectedDate);
      setAddAvulsoModalVisible(false);
    } catch (error) {
      console.error("Erro ao salvar reserva avulsa:", error);
      Alert.alert("Erro", "Não foi possível salvar a reserva.");
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) setSelectedRentalDates({});
    updateMarkedDates(
      reservas,
      selectedDate,
      selectionMode ? selectedRentalDates : {}
    );
  };

  const handleConfirmRental = () => {
    if (Object.keys(selectedRentalDates).length === 0) {
      Alert.alert("Erro", "Nenhum dia selecionado para aluguel!");
      return;
    }
    setRentalNome("");
    setRentalResponsavel("");
    setRentalTelefone("");
    setRentalHorarioInicio("");
    setRentalHorarioFim("");
    setAddRentalModalVisible(true);
  };

  const handleSaveRental = async () => {
    if (
      !rentalNome ||
      !rentalResponsavel ||
      !rentalTelefone ||
      !rentalHorarioInicio ||
      !rentalHorarioFim
    ) {
      Alert.alert("Erro", "Preencha todos os campos!");
      return;
    }
    if (
      !moment(rentalHorarioInicio, "HH:mm", true).isValid() ||
      !moment(rentalHorarioFim, "HH:mm", true).isValid()
    ) {
      Alert.alert(
        "Erro",
        "Horários devem estar no formato HH:mm (ex.: 17:00)!"
      );
      return;
    }

    try {
      const rentalDates = Object.keys(selectedRentalDates);
      for (const date of rentalDates) {
        const reservasDia = await fetchReservasDoDia(date);
        if (
          hasTimeConflict(rentalHorarioInicio, rentalHorarioFim, reservasDia)
        ) {
          Alert.alert(
            "Erro",
            `Conflito de horário no dia ${moment(date).format("DD/MM/YYYY")}!`
          );
          return;
        }
      }

      const newReservas = [];
      for (const date of rentalDates) {
        const reserva = {
          data: date,
          horarioInicio: rentalHorarioInicio,
          horarioFim: rentalHorarioFim,
          nome: rentalNome,
          responsavel: rentalResponsavel,
          telefone: rentalTelefone,
          campoId: selectedCampoId,
          tipo: "avulso",
        };
        const docRef = await addDoc(collection(db, "reservas"), reserva);
        newReservas.push({ id: docRef.id, ...reserva });
      }

      const updatedReservas = [...reservas, ...newReservas];
      setReservas(updatedReservas);
      updateMarkedDates(updatedReservas, selectedDate);
      setSelectedRentalDates({});
      setSelectionMode(false);
      setAddRentalModalVisible(false);
    } catch (error) {
      console.error("Erro ao salvar reservas de aluguel:", error);
      Alert.alert("Erro", "Não foi possível salvar as reservas.");
    }
  };

  const renderReservaItem = ({ item }) => (
    <TouchableOpacity
      style={styles.reservaItem}
      onPress={() => item.id && handleEditReserva(item)}
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
      <View style={styles.legendContainer}>
        <Text style={[styles.legendText, { color: "#FFA500" }]}>
          ■ Aluguéis Avulsos
        </Text>
        <Text style={[styles.legendText, { color: "#28A745" }]}>
          ■ Aluguéis Mensais
        </Text>
      </View>
      <Picker
        selectedValue={selectedCampoId}
        onValueChange={(itemValue) => setSelectedCampoId(itemValue)}
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
      <TouchableOpacity
        style={styles.toggleSelectionButton}
        onPress={toggleSelectionMode}
      >
        <Text style={styles.toggleSelectionText}>
          {selectionMode
            ? "Sair do Modo Seleção"
            : "Selecionar Dias para Alugar"}
        </Text>
      </TouchableOpacity>
      {selectionMode && (
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmRental}
        >
          <Text style={styles.confirmButtonText}>Confirmar Aluguel</Text>
        </TouchableOpacity>
      )}
      <Calendar
        current={selectedDate}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          calendarBackground: "#fff",
          selectedDayBackgroundColor: "#007AFF",
          selectedDayTextColor: "#fff",
          todayTextColor: "#007AFF",
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
              onPress={handleAddReservaMensal}
            >
              <Text style={styles.addButtonText}>Adicionar Mensal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addAvulsoButton}
              onPress={handleAddAvulso}
            >
              <Text style={styles.addButtonText}>Adicionar Avulso</Text>
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
      {/* Modal de Adição Avulsa */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addAvulsoModalVisible}
        onRequestClose={() => setAddAvulsoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Reserva Avulsa</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={avulsoNome}
              onChangeText={setAvulsoNome}
            />
            <TextInput
              style={styles.input}
              placeholder="Responsável"
              value={avulsoResponsavel}
              onChangeText={setAvulsoResponsavel}
            />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              value={avulsoTelefone}
              onChangeText={setAvulsoTelefone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Horário Início (ex.: 17:00)"
              value={avulsoHorarioInicio}
              onChangeText={setAvulsoHorarioInicio}
            />
            <TextInput
              style={styles.input}
              placeholder="Horário Fim (ex.: 18:00)"
              value={avulsoHorarioFim}
              onChangeText={setAvulsoHorarioFim}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveAvulso}
            >
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setAddAvulsoModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Modal de Adição de Aluguel */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addRentalModalVisible}
        onRequestClose={() => setAddRentalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Adicionar Reservas para {Object.keys(selectedRentalDates).length}{" "}
              Dias
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={rentalNome}
              onChangeText={setRentalNome}
            />
            <TextInput
              style={styles.input}
              placeholder="Responsável"
              value={rentalResponsavel}
              onChangeText={setRentalResponsavel}
            />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              value={rentalTelefone}
              onChangeText={setRentalTelefone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Horário Início (ex.: 17:00)"
              value={rentalHorarioInicio}
              onChangeText={setRentalHorarioInicio}
            />
            <TextInput
              style={styles.input}
              placeholder="Horário Fim (ex.: 18:00)"
              value={rentalHorarioFim}
              onChangeText={setRentalHorarioFim}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveRental}
            >
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setAddRentalModalVisible(false)}
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
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 5, color: "#333" },
  legendContainer: { marginBottom: 10 },
  legendText: { fontSize: 14, marginBottom: 2 },
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
  toggleSelectionButton: {
    backgroundColor: "#FFA500",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: "center",
  },
  toggleSelectionText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  confirmButton: {
    backgroundColor: "#00FF00",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: "center",
  },
  confirmButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
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
  reservaList: { maxHeight: 300, width: "100%" },
  reservaItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  reservaText: { fontSize: 14, color: "#333" },
  noReservasText: { fontSize: 14, color: "#999", marginBottom: 15 },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
  },
  addAvulsoButton: {
    backgroundColor: "#28A745",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cancelButton: {
    backgroundColor: "#FF0000",
    padding: 8,
    borderRadius: 5,
    marginTop: 5,
    alignItems: "center",
  },
  cancelButtonText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  closeButton: {
    backgroundColor: "#FF0000",
    padding: 10,
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
  },
  closeButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
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
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
