import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
} from "react-native";
import moment from "moment";
import "moment/locale/pt-br";
import { turmaService } from "../services/turmaService";
import { escolinhaService } from "../services/escolinhaService";
import { configService } from "../services/configService";
import { db } from "../services/firebaseService";
import { collection, query, where, getDocs } from "firebase/firestore";

moment.locale("pt-br");

export default function CampoDetailScreen({ route, navigation }) {
  const {
    campo,
    turmas: initialTurmas,
    diaSelecionado: diaInicial,
    itemId,
    mode = "turmas",
  } = route.params || {};
  const [turmasDoCampo, setTurmasDoCampo] = useState(initialTurmas || []);
  const [aulasDoCampo, setAulasDoCampo] = useState([]);
  const [reservasDoFirestore, setReservasDoFirestore] = useState([]);
  const [horarioFuncionamento, setHorarioFuncionamento] = useState({
    inicio: "09:00",
    fim: "23:00",
  });

  const diasDaSemana = [
    "domingo",
    "segunda",
    "terça",
    "quarta",
    "quinta",
    "sexta",
    "sábado",
  ];
  const [diaSelecionado, setDiaSelecionado] = useState(
    diaInicial || diasDaSemana[new Date().getDay()]
  );
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const updatedTurmas = await turmaService.getTurmas();
      const updatedAulas = await escolinhaService.getAulas();
      const horario = await configService.getHorarioFuncionamento();
      const reservas = await buscarReservasDoFirestore(campo.id);

      const turmasFiltradas = updatedTurmas.filter(
        (t) => t.campoId === campo.id
      );
      const aulasFiltradas = updatedAulas.filter((a) => a.campoId === campo.id);

      console.log("CampoDetailScreen: Turmas filtradas:", turmasFiltradas);
      console.log("CampoDetailScreen: Aulas filtradas:", aulasFiltradas);
      console.log("CampoDetailScreen: Reservas carregadas:", reservas);

      setTurmasDoCampo(turmasFiltradas);
      setAulasDoCampo(aulasFiltradas);
      setReservasDoFirestore(reservas);
      setHorarioFuncionamento(horario);
    };

    fetchData();
    const unsubscribe = navigation.addListener("focus", fetchData);
    return () => unsubscribe();
  }, [navigation, campo.id, mode]);

  const buscarReservasDoFirestore = async (campoId) => {
    try {
      const reservasRef = collection(db, "reservas");
      const q = query(reservasRef, where("campoId", "==", campoId));
      const querySnapshot = await getDocs(q);
      const reservas = [];
      querySnapshot.forEach((doc) => {
        reservas.push({ id: doc.id, ...doc.data() });
      });
      console.log("CampoDetailScreen: Reservas do Firestore:", reservas);
      return reservas;
    } catch (error) {
      console.error("Erro ao buscar reservas do Firestore:", error);
      return [];
    }
  };

  const itensDoDia = [
    ...turmasDoCampo.filter(
      (item) => item.dia && item.dia.toLowerCase() === diaSelecionado
    ),
    ...aulasDoCampo.filter(
      (item) => item.dia && item.dia.toLowerCase() === diaSelecionado
    ),
    ...reservasDoFirestore
      .filter((reserva) => {
        const diaReserva = moment(reserva.data)
          .format("dddd")
          .toLowerCase()
          .replace("-feira", "");
        const matchesDay = diaReserva === diaSelecionado;
        const isSameWeek = moment(reserva.data).isSame(moment(), "week");

        // Lógica de filtragem por tipo de reserva e modo
        if (reserva.tipo === "avulso" || reserva.tipo === "mensal") {
          // Avulsas e Mensais aparecem apenas no modo "turmas"
          return mode === "turmas" && matchesDay && isSameWeek;
        } else if (reserva.tipo === "anual") {
          // Anuais aparecem apenas no modo "escolinha" e na semana atual
          return mode === "escolinha" && matchesDay && isSameWeek;
        }
        return false;
      })
      .map((reserva) => ({
        ...reserva,
        inicio: reserva.horarioInicio,
        fim: reserva.horarioFim,
      })),
  ].sort(
    (a, b) =>
      a.inicio?.localeCompare(b.inicio) ||
      a.horarioInicio?.localeCompare(b.horarioInicio)
  );

  console.log("CampoDetailScreen: Itens do dia para renderizar:", itensDoDia);

  const calcularHorariosDisponiveis = (inicio, fim, itensOcupados) => {
    const horarios = [];
    let currentTime = parseTime(inicio);
    const endTime = parseTime(fim);

    while (currentTime < endTime) {
      const nextTime = new Date(currentTime.getTime() + 90 * 60 * 1000);
      if (nextTime <= endTime) {
        const horarioInicio = formatTime(currentTime);
        const horarioFim = formatTime(nextTime);
        horarios.push({ inicio: horarioInicio, fim: horarioFim });
      }
      currentTime = nextTime;
    }

    return horarios.filter((horario) => {
      return !itensOcupados.some((ocupado) =>
        isOverlapping(horario.inicio, horario.fim, ocupado.inicio, ocupado.fim)
      );
    });
  };

  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (date) => {
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const isOverlapping = (inicio1, fim1, inicio2, fim2) => {
    const start1 = parseTime(inicio1);
    const end1 = parseTime(fim1);
    const start2 = parseTime(inicio2);
    const end2 = parseTime(fim2);
    return start1 < end2 && start2 < end1;
  };

  useEffect(() => {
    const itensOcupados = [
      ...turmasDoCampo.filter(
        (item) => item.dia && item.dia.toLowerCase() === diaSelecionado
      ),
      ...aulasDoCampo.filter(
        (item) => item.dia && item.dia.toLowerCase() === diaSelecionado
      ),
      ...reservasDoFirestore
        .filter((reserva) => {
          const diaReserva = moment(reserva.data)
            .format("dddd")
            .toLowerCase()
            .replace("-feira", "");
          const matchesDay = diaReserva === diaSelecionado;
          const isSameWeek = moment(reserva.data).isSame(moment(), "week");

          if (reserva.tipo === "avulso" || reserva.tipo === "mensal") {
            return mode === "turmas" && matchesDay && isSameWeek;
          } else if (reserva.tipo === "anual") {
            return mode === "escolinha" && matchesDay && isSameWeek;
          }
          return false;
        })
        .map((reserva) => ({
          inicio: reserva.horarioInicio,
          fim: reserva.horarioFim,
        })),
    ].map((item) => ({
      inicio: item.inicio || item.horarioInicio,
      fim: item.fim || item.horarioFim,
    }));

    const horariosLivres = calcularHorariosDisponiveis(
      horarioFuncionamento.inicio,
      horarioFuncionamento.fim,
      itensOcupados
    );
    setHorariosDisponiveis(horariosLivres);
  }, [
    turmasDoCampo,
    aulasDoCampo,
    reservasDoFirestore,
    diaSelecionado,
    horarioFuncionamento,
    mode,
  ]);

  const formatarDataCriacao = (createdAt) => {
    if (!createdAt) return "Data não disponível";
    const dataCriacao = new Date(createdAt);
    return dataCriacao.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

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

  const isTurmaEmAtraso = (createdAt) => {
    if (mode !== "turmas" || !createdAt) return false;
    const dataCriacao = new Date(createdAt);
    const proximoPagamento = new Date(dataCriacao);
    proximoPagamento.setDate(dataCriacao.getDate() + 30);
    const hoje = new Date();
    return hoje > proximoPagamento;
  };

  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (mode === "turmas") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [blinkAnim, mode]);

  const handleDiaPress = (dia) => {
    setDiaSelecionado(dia);
  };

  const handleAddTurma = () => {
    navigation.navigate("AddTurma", {
      campoId: campo.id,
      dia: diaSelecionado,
      mode,
    });
  };

  const handleHorarioPress = (horario) => {
    navigation.navigate("AddTurma", {
      campoId: campo.id,
      dia: diaSelecionado,
      inicio: horario.inicio,
      fim: horario.fim,
      mode,
      tipo: "mensal",
    });
  };

  const handleEditTurma = (item) => {
    navigation.navigate("AddTurma", { campoId: campo.id, turma: item, mode });
  };

  const handleDeleteTurma = async (id) => {
    try {
      if (mode === "turmas") {
        await turmaService.deleteTurma(id);
        setTurmasDoCampo(turmasDoCampo.filter((turma) => turma.id !== id));
      } else {
        await escolinhaService.deleteAula(id);
        setAulasDoCampo(aulasDoCampo.filter((aula) => aula.id !== id));
      }
    } catch (error) {
      console.error("Erro ao deletar item:", error);
      alert("Erro ao deletar o item.");
    }
  };

  const renderDiaButton = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.diaButton,
        diaSelecionado === item && styles.diaButtonSelected,
      ]}
      onPress={() => handleDiaPress(item)}
    >
      <Text
        style={[
          styles.diaText,
          diaSelecionado === item && styles.diaTextSelected,
        ]}
      >
        {item.substring(0, 3).toUpperCase()}
      </Text>
    </TouchableOpacity>
  );

  const renderHorarioButton = ({ item }) => (
    <TouchableOpacity
      style={styles.horarioButton}
      onPress={() => handleHorarioPress(item)}
    >
      <Text style={styles.horarioText}>{`${item.inicio} - ${item.fim}`}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {campo.nome} ({mode === "turmas" ? "Turmas" : "Escolinha"})
        </Text>
      </View>
      <View style={styles.turmasContainer}>
        {itensDoDia.length > 0 ? (
          itensDoDia.map((item) => {
            const emAtraso =
              mode === "turmas" && item.createdAt
                ? isTurmaEmAtraso(item.createdAt)
                : false;
            return (
              <Animated.View
                key={item.id}
                style={[
                  styles.turmaCard,
                  emAtraso && {
                    backgroundColor: "#FF0000",
                    opacity: blinkAnim,
                  },
                ]}
              >
                <Text style={[styles.turmaTime, emAtraso && styles.textWhite]}>
                  {item.inicio || item.horarioInicio} -{" "}
                  {item.fim || item.horarioFim}
                </Text>
                <Text style={[styles.turmaName, emAtraso && styles.textWhite]}>
                  {item.nome}
                </Text>
                <Text
                  style={[styles.turmaDetail, emAtraso && styles.textWhite]}
                >
                  Responsável: {item.responsavel || "N/A"}
                </Text>
                <Text
                  style={[styles.turmaDetail, emAtraso && styles.textWhite]}
                >
                  Telefone: {item.telefone || "N/A"}
                </Text>
                {item.createdAt && (
                  <Text
                    style={[styles.turmaDetail, emAtraso && styles.textWhite]}
                  >
                    Criado em: {formatarDataCriacao(item.createdAt)}
                  </Text>
                )}
                {mode === "turmas" && item.createdAt && (
                  <Text
                    style={[styles.turmaDetail, emAtraso && styles.textWhite]}
                  >
                    Próximo pagamento:{" "}
                    {calcularProximoPagamento(item.createdAt)}
                  </Text>
                )}
                {item.data && (
                  <Text
                    style={[styles.turmaDetail, emAtraso && styles.textWhite]}
                  >
                    Data: {moment(item.data).format("DD/MM/YYYY")}
                  </Text>
                )}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditTurma(item)}
                  >
                    <Text style={styles.actionText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTurma(item.id)}
                  >
                    <Text style={styles.actionText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })
        ) : (
          <Text style={styles.noTurmaText}>Nenhum item neste dia</Text>
        )}
      </View>

      <FlatList
        data={diasDaSemana}
        renderItem={renderDiaButton}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.diasContainer}
      />

      <FlatList
        data={horariosDisponiveis}
        renderItem={renderHorarioButton}
        keyExtractor={(item) => `${item.inicio}-${item.fim}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.horariosContainer}
        ListEmptyComponent={
          <Text style={styles.noHorarioText}>Nenhum horário disponível</Text>
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04394e",
    padding: 15,
  },
  header: {
    backgroundColor: "#04394e",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  diasContainer: {
    marginBottom: 15,
  },
  diaButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    backgroundColor: "#ddd",
    borderRadius: 5,
  },
  diaButtonSelected: {
    backgroundColor: "#007AFF",
  },
  diaText: {
    fontSize: 16,
    color: "#333",
  },
  diaTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  horariosContainer: {
    marginBottom: 15,
  },
  horarioButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    backgroundColor: "#28a745",
    borderRadius: 5,
  },
  horarioText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
  noHorarioText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    paddingLeft: 5,
  },
  turmasContainer: {
    marginBottom: 20,
  },
  turmaCard: {
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
  turmaTime: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 5,
  },
  turmaName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 5,
  },
  turmaDetail: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  textWhite: {
    color: "#fff",
  },
  noTurmaText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    paddingLeft: 5,
  },
  actions: {
    flexDirection: "row",
    marginTop: 10,
  },
  editButton: {
    backgroundColor: "#FFA500",
    padding: 8,
    borderRadius: 5,
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: "#FF0000",
    padding: 8,
    borderRadius: 5,
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
