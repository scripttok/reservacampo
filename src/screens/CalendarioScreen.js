import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
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

// Configuração do calendário em português
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
  ("CalendarioScreen: Componente montado");

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
  const [addAulaModalVisible, setAddAulaModalVisible] = useState(false);
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
  const [aulaNome, setAulaNome] = useState("");
  const [aulaResponsavel, setAulaResponsavel] = useState("");
  const [aulaTelefone, setAulaTelefone] = useState("");
  const [aulaHorarioInicio, setAulaHorarioInicio] = useState("");
  const [aulaHorarioFim, setAulaHorarioFim] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRentalDates, setSelectedRentalDates] = useState({});
  const [needsFetch, setNeedsFetch] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchReservas = useCallback(async () => {
    ("CalendarioScreen: fetchReservas iniciado");
    try {
      const reservasRef = collection(db, "reservas");
      const q = query(reservasRef);
      const querySnapshot = await getDocs(q);
      const reservasData = [];
      querySnapshot.forEach((doc) => {
        reservasData.push({ id: doc.id, ...doc.data() });
      });
      "CalendarioScreen: fetchReservas concluído, reservas:",
        reservasData.length;
      return reservasData;
    } catch (error) {
      console.error("CalendarioScreen: Erro em fetchReservas:", error);
      return [];
    }
  }, []);

  const fetchData = useCallback(async () => {
    "CalendarioScreen: fetchData chamado, needsFetch:", needsFetch;
    if (!needsFetch) {
      ("CalendarioScreen: fetchData ignorado, já buscado");
      return;
    }
    ("CalendarioScreen: Iniciando busca de dados");
    setIsLoading(true);
    try {
      const camposData = await campoService.getCampos();
      "CalendarioScreen: Campos carregados:", camposData;
      setCampos(camposData);
      const reservasData = await fetchReservas();
      "CalendarioScreen: Reservas carregadas:", reservasData;
      setReservas(reservasData);
      if (camposData.length > 0 && !selectedCampoId) {
        "CalendarioScreen: Definindo selectedCampoId inicial:",
          camposData[0].id;
        setSelectedCampoId(camposData[0].id);
      }
      setIsLoading(false);
      setNeedsFetch(false);
      ("CalendarioScreen: fetchData concluído");
      updateMarkedDates(reservasData, selectedDate);
    } catch (error) {
      console.error("CalendarioScreen: Erro ao buscar dados:", error);
      setIsLoading(false);
    }
  }, [
    fetchReservas,
    selectedCampoId,
    needsFetch,
    selectedDate,
    updateMarkedDates,
  ]);

  // useEffect inicial para carregar dados
  useEffect(() => {
    ("CalendarioScreen: Primeiro useEffect disparado");
    fetchData();
  }, [fetchData]);

  // useEffect para atualizar ao voltar da tela AddTurma
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      ("CalendarioScreen: Tela em foco, forçando fetchData");
      setNeedsFetch(true);
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  // useEffect para atualizar markedDates ao mudar o campo selecionado
  useEffect(() => {
    "CalendarioScreen: useEffect de selectedCampoId disparado, campo:",
      selectedCampoId;
    if (selectedCampoId && reservas.length > 0) {
      updateMarkedDates(reservas, selectedDate);
    }
  }, [selectedCampoId, reservas, selectedDate, updateMarkedDates]);

  const generateMarkedDates = useMemo(() => {
    return (reservasData, selected, rentalDates) => {
      "CalendarioScreen: generateMarkedDates chamado com reservas:",
        reservasData.length,
        "selected:",
        selected,
        "rentalDates:",
        Object.keys(rentalDates);
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
          } else if (reserva.tipo === "anual") {
            const diaSemana = dataInicial.day();
            const startOfPeriod = dataInicial.clone().startOf("day");
            const endOfPeriod = dataInicial
              .clone()
              .add(12, "months")
              .startOf("day");
            let currentDate = startOfPeriod.clone();
            while (currentDate.isSameOrBefore(endOfPeriod)) {
              if (currentDate.day() === diaSemana) {
                const anualDateStr = currentDate.format("YYYY-MM-DD");
                marked[anualDateStr] = {
                  selected: true,
                  selectedColor: "#800080",
                };
              }
              currentDate.add(1, "week");
            }
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

      "CalendarioScreen: Novos markedDates calculados:",
        Object.keys(marked).length;
      return marked;
    };
  }, [selectedCampoId]);

  const updateMarkedDates = useCallback(
    (reservasData, selected, rentalDates = selectedRentalDates) => {
      const newMarkedDates = generateMarkedDates(
        reservasData,
        selected,
        rentalDates
      );
      setMarkedDates((prev) => {
        const prevKeys = Object.keys(prev);
        const newKeys = Object.keys(newMarkedDates);
        const keysChanged =
          prevKeys.length !== newKeys.length ||
          prevKeys.some((key) => !newKeys.includes(key));
        const valuesChanged = prevKeys.some(
          (key) =>
            JSON.stringify(prev[key]) !== JSON.stringify(newMarkedDates[key])
        );
        const hasChanged = keysChanged || valuesChanged;
        "CalendarioScreen: Comparando markedDates, mudou?", hasChanged;
        return hasChanged ? newMarkedDates : prev;
      });
    },
    [generateMarkedDates, selectedRentalDates]
  );

  const fetchReservasDoDia = useCallback(
    async (date) => {
      "CalendarioScreen: fetchReservasDoDia iniciado para", date;
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
          const isAnual =
            reserva.tipo === "anual" &&
            reservaDate.day() === moment(date).day() &&
            moment(date).isBetween(
              reservaDate,
              reservaDate.clone().add(12, "months"),
              null,
              "[]"
            );
          return isSameDate || isMensal || isAnual;
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
          (a.inicio || a.horarioInicio).localeCompare(
            b.inicio || b.horarioInicio
          )
        );
        "CalendarioScreen: fetchReservasDoDia concluído, reservas do dia:",
          reservasDia.length;
        return reservasDia;
      } catch (error) {
        console.error("CalendarioScreen: Erro em fetchReservasDoDia:", error);
        return [];
      }
    },
    [reservas, selectedCampoId]
  );

  const hasTimeConflict = (
    inicio,
    fim,
    reservasExistentes,
    reservaId = null
  ) => {
    "CalendarioScreen: Verificando conflito de horário, início:",
      inicio,
      "fim:",
      fim;
    const newStart = moment(inicio, "HH:mm");
    const newEnd = moment(fim, "HH:mm");
    const conflict = reservasExistentes.some((reserva) => {
      if (reservaId && reserva.id === reservaId) return false;
      const existingStart = moment(
        reserva.inicio || reserva.horarioInicio,
        "HH:mm"
      );
      const existingEnd = moment(reserva.fim || reserva.horarioFim, "HH:mm");
      return newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
    });
    "CalendarioScreen: Conflito encontrado?", conflict;
    return conflict;
  };

  const handleDayPress = useCallback(
    (day) => {
      const date = day.dateString;
      "CalendarioScreen: handleDayPress, dia pressionado:", date;
      if (selectionMode) {
        const newSelectedDates = { ...selectedRentalDates };
        if (newSelectedDates[date]) {
          delete newSelectedDates[date];
        } else {
          newSelectedDates[date] = true;
        }
        "CalendarioScreen: Modo seleção, novos selectedRentalDates:",
          Object.keys(newSelectedDates);
        setSelectedRentalDates(newSelectedDates);
        updateMarkedDates(reservas, selectedDate, newSelectedDates);
      } else {
        ("CalendarioScreen: Modo normal, definindo selectedDate");
        setSelectedDate(date);
        if (!selectedCampoId) {
          ("CalendarioScreen: Nenhum campo selecionado");
          alert("Por favor, selecione um campo antes de continuar!");
          return;
        }
        fetchReservasDoDia(date).then((data) => {
          "CalendarioScreen: Reservas do dia carregadas:", data;
          setReservasDoDia(data);
          setModalVisible(true);
        });
      }
    },
    [
      selectionMode,
      selectedRentalDates,
      selectedCampoId,
      reservas,
      selectedDate,
      updateMarkedDates,
    ]
  );

  const handleEditReserva = useCallback((reserva) => {
    "CalendarioScreen: handleEditReserva, reserva:", reserva.id;
    setSelectedReserva(reserva);
    setEditNome(reserva.nome);
    setEditResponsavel(reserva.responsavel);
    setEditTelefone(reserva.telefone);
    setEditHorarioInicio(reserva.inicio || reserva.horarioInicio);
    setEditHorarioFim(reserva.fim || reserva.horarioFim);
    setEditModalVisible(true);
  }, []);

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
      setNeedsFetch(true);
      // Sinaliza que ReportsScreen deve atualizar
      navigation.setParams({ shouldUpdate: true });
    } catch (error) {
      console.error("CalendarioScreen: Erro ao atualizar reserva:", error);
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
              setNeedsFetch(true);
              // Sinaliza que ReportsScreen deve atualizar
              navigation.setParams({ shouldUpdate: true });
            } catch (error) {
              console.error(
                "CalendarioScreen: Erro ao cancelar reserva:",
                error
              );
              Alert.alert("Erro", "Não foi possível cancelar a reserva.");
            }
          },
        },
      ]
    );
  };

  const handleAddReservaMensal = useCallback(() => {
    ("CalendarioScreen: handleAddReservaMensal iniciado");
    const reservasDia = reservasDoDia;
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
    ("CalendarioScreen: Navegando para AddTurma");
  }, [navigation, selectedDate, selectedCampoId, reservasDoDia]);

  const handleAddAvulso = useCallback(() => {
    ("CalendarioScreen: handleAddAvulso iniciado");
    setAvulsoNome("");
    setAvulsoResponsavel("");
    setAvulsoTelefone("");
    setAvulsoHorarioInicio("");
    setAvulsoHorarioFim("");
    setAddAvulsoModalVisible(true);
  }, []);

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
      setNeedsFetch(true);
      // Sinaliza que ReportsScreen deve atualizar
      navigation.setParams({ shouldUpdate: true });
    } catch (error) {
      console.error("CalendarioScreen: Erro ao salvar reserva avulsa:", error);
      Alert.alert("Erro", "Não foi possível salvar a reserva.");
    }
  };

  const handleAddAula = useCallback(() => {
    ("CalendarioScreen: handleAddAula iniciado");
    setAulaNome("");
    setAulaResponsavel("");
    setAulaTelefone("");
    setAulaHorarioInicio("");
    setAulaHorarioFim("");
    setAddAulaModalVisible(true);
  }, []);

  const handleSaveAula = async () => {
    setIsSaving(true);
    if (
      !aulaNome ||
      !aulaResponsavel ||
      !aulaTelefone ||
      !aulaHorarioInicio ||
      !aulaHorarioFim
    ) {
      Alert.alert("Erro", "Preencha todos os campos!");
      setIsSaving(false);
      return;
    }
    if (
      !moment(aulaHorarioInicio, "HH:mm", true).isValid() ||
      !moment(aulaHorarioFim, "HH:mm", true).isValid()
    ) {
      Alert.alert(
        "Erro",
        "Horários devem estar no formato HH:mm (ex.: 17:00)!"
      );
      setIsSaving(false);
      return;
    }
    if (aulaHorarioInicio === aulaHorarioFim) {
      Alert.alert("Erro", "Horário de início e fim não podem ser iguais!");
      setIsSaving(false);
      return;
    }

    const startDate = moment(selectedDate);
    const endDate = startDate.clone().add(12, "months");
    let currentDate = startDate.clone();

    const turmas = await turmaService.getTurmas();
    const aulas = await escolinhaService.getAulas();
    const diaSemana = startDate
      .format("dddd")
      .toLowerCase()
      .replace("-feira", "");

    while (currentDate.isSameOrBefore(endDate)) {
      if (currentDate.day() === startDate.day()) {
        const dateStr = currentDate.format("YYYY-MM-DD");
        const reservasDia = [
          ...turmas.filter(
            (t) => t.dia === diaSemana && t.campoId === selectedCampoId
          ),
          ...aulas.filter(
            (a) => a.dia === diaSemana && a.campoId === selectedCampoId
          ),
          ...reservas.filter((reserva) => {
            const reservaDate = moment(reserva.data);
            return (
              reserva.campoId === selectedCampoId &&
              reservaDate.day() === startDate.day() &&
              moment(dateStr).isBetween(
                reservaDate,
                reservaDate
                  .clone()
                  .add(
                    reserva.tipo === "anual" ? 12 : 1,
                    reserva.tipo === "anual" ? "months" : "month"
                  ),
                null,
                "[]"
              )
            );
          }),
        ];

        if (hasTimeConflict(aulaHorarioInicio, aulaHorarioFim, reservasDia)) {
          Alert.alert(
            "Erro",
            `Conflito de horário no dia ${currentDate.format("DD/MM/YYYY")}!`
          );
          setIsSaving(false);
          return;
        }
      }
      currentDate.add(1, "week");
    }

    try {
      const reserva = {
        data: selectedDate,
        horarioInicio: aulaHorarioInicio,
        horarioFim: aulaHorarioFim,
        nome: aulaNome,
        responsavel: aulaResponsavel,
        telefone: aulaTelefone,
        campoId: selectedCampoId,
        tipo: "anual",
      };
      const docRef = await addDoc(collection(db, "reservas"), reserva);
      const updatedReservas = [...reservas, { id: docRef.id, ...reserva }];
      setReservas(updatedReservas);
      setReservasDoDia(await fetchReservasDoDia(selectedDate));
      updateMarkedDates(updatedReservas, selectedDate);
      setAddAulaModalVisible(false);
      setNeedsFetch(true);
      // Sinaliza que ReportsScreen deve atualizar
      navigation.setParams({ shouldUpdate: true });
    } catch (error) {
      console.error("CalendarioScreen: Erro ao salvar reserva anual:", error);
      Alert.alert("Erro", "Não foi possível salvar a reserva.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelectionMode = useCallback(() => {
    "CalendarioScreen: toggleSelectionMode, novo estado:", !selectionMode;
    setSelectionMode((prev) => !prev);
    if (selectionMode) {
      setSelectedRentalDates({});
    }
    updateMarkedDates(reservas, selectedDate);
  }, [selectionMode, reservas, selectedDate, updateMarkedDates]);

  const handleConfirmRental = useCallback(() => {
    ("CalendarioScreen: handleConfirmRental iniciado");
    if (Object.keys(selectedRentalDates).length === 0) {
      ("CalendarioScreen: Nenhum dia selecionado para aluguel");
      Alert.alert("Erro", "Nenhum dia selecionado para aluguel!");
      return;
    }
    setRentalNome("");
    setRentalResponsavel("");
    setRentalTelefone("");
    setRentalHorarioInicio("");
    setRentalHorarioFim("");
    setAddRentalModalVisible(true);
  }, [selectedRentalDates]);

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
      setNeedsFetch(true);
      // Sinaliza que ReportsScreen deve atualizar
      navigation.setParams({ shouldUpdate: true });
    } catch (error) {
      console.error(
        "CalendarioScreen: Erro ao salvar reservas de aluguel:",
        error
      );
      Alert.alert("Erro", "Não foi possível salvar as reservas.");
    }
  };

  const renderReservaItem = useCallback(
    ({ item }) => {
      "CalendarioScreen: Renderizando reserva:", item.id || item.nome;
      return (
        <TouchableOpacity
          style={styles.reservaItem}
          onPress={() => item.id && handleEditReserva(item)}
        >
          <Text style={styles.reservaText}>
            {item.inicio || item.horarioInicio} - {item.fim || item.horarioFim}
          </Text>
          <Text style={styles.reservaText}>Nome: {item.nome}</Text>
          <Text style={styles.reservaText}>
            Responsável: {item.responsavel}
          </Text>
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
    },
    [handleEditReserva]
  );

  ("CalendarioScreen: Renderizando componente");
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Selecione um Campo:</Text>

      <Picker
        selectedValue={selectedCampoId}
        onValueChange={(itemValue) => {
          "CalendarioScreen: Picker mudou, novo selectedCampoId:", itemValue;
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
      <View style={styles.legendContainer}>
        <Text style={[styles.legendText, { color: "#FFA500" }]}>
          ■ Aluguéis Avulsos
        </Text>
        <Text style={[styles.legendText, { color: "#28A745" }]}>
          ■ Aluguéis Mensais
        </Text>
        <Text style={[styles.legendText, { color: "#800080" }]}>
          ■ Aulas (Anual)
        </Text>
      </View>
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
              style={styles.addAulaButton}
              onPress={handleAddAula}
            >
              <Text style={styles.addButtonText}>Adicionar Aula</Text>
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
              {isSaving && <ActivityIndicator size="large" color="#0000ff" />}
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
      <Modal
        animationType="slide"
        transparent={true}
        visible={addAulaModalVisible}
        onRequestClose={() => setAddAulaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Aula (Anual)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da Aula"
              value={aulaNome}
              onChangeText={setAulaNome}
            />
            <TextInput
              style={styles.input}
              placeholder="Responsável"
              value={aulaResponsavel}
              onChangeText={setAulaResponsavel}
            />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              value={aulaTelefone}
              onChangeText={setAulaTelefone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Horário Início (ex.: 17:00)"
              value={aulaHorarioInicio}
              onChangeText={setAulaHorarioInicio}
            />
            <TextInput
              style={styles.input}
              placeholder="Horário Fim (ex.: 18:00)"
              value={aulaHorarioFim}
              onChangeText={setAulaHorarioFim}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveAula}
            >
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setAddAulaModalVisible(false)}
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
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 40,
    color: "#333",
  },
  legendContainer: { marginBottom: 4, marginTop: 30 },
  legendText: { fontSize: 14, marginBottom: 2 },
  picker: {
    // marginTop: 30,
    height: 50,
    width: "100%",
    marginBottom: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
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
  addAulaButton: {
    backgroundColor: "#800080",
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
