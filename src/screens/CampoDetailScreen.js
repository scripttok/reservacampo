// src/screens/CampoDetailScreen.js
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
import { turmaService } from "../services/turmaService";
import { configService } from "../services/configService";

export default function CampoDetailScreen({ route, navigation }) {
  const { campo, turmas, diaSelecionado: diaInicial, itemId } = route.params; // Renomeado para evitar confusão
  const [turmasDoCampo, setTurmasDoCampo] = useState(turmas); // Usar turmas passadas inicialmente
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
      console.log(
        "CampoDetailScreen: Buscando turmas para o campo:",
        campo.nome
      );
      const updatedTurmas = await turmaService.getTurmas(); // Mantém a atualização do backend
      const horario = await configService.getHorarioFuncionamento();
      console.log(
        "CampoDetailScreen: Turmas carregadas:",
        updatedTurmas.length
      );
      setTurmasDoCampo(updatedTurmas.filter((t) => t.campoId === campo.id)); // Filtra apenas turmas do campo
      setHorarioFuncionamento(horario);
    };

    fetchData();
    const unsubscribe = navigation.addListener("focus", fetchData);
    return () => unsubscribe();
  }, [navigation, campo.id]);

  const turmasDoDia = turmasDoCampo
    .filter(
      (t) => t.campoId === campo.id && t.dia.toLowerCase() === diaSelecionado
    )
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const calcularHorariosDisponiveis = (inicio, fim, turmasOcupadas) => {
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
      return !turmasOcupadas.some((ocupado) =>
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
    if (!createdAt) return false;
    const dataCriacao = new Date(createdAt);
    const proximoPagamento = new Date(dataCriacao);
    proximoPagamento.setDate(dataCriacao.getDate() + 30);
    const hoje = new Date();
    return hoje > proximoPagamento;
  };

  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
  }, [blinkAnim]);

  useEffect(() => {
    const horariosOcupados = turmasDoDia.map((turma) => ({
      inicio: turma.inicio,
      fim: turma.fim,
    }));
    const horariosLivres = calcularHorariosDisponiveis(
      horarioFuncionamento.inicio,
      horarioFuncionamento.fim,
      horariosOcupados
    );
    setHorariosDisponiveis(horariosLivres);
  }, [turmasDoCampo, diaSelecionado, horarioFuncionamento]);

  const handleDiaPress = (dia) => {
    setDiaSelecionado(dia);
  };

  const handleAddTurma = () => {
    navigation.navigate("AddTurma", { campoId: campo.id, dia: diaSelecionado });
  };

  const handleHorarioPress = (horario) => {
    navigation.navigate("AddTurma", {
      campoId: campo.id,
      dia: diaSelecionado,
      inicio: horario.inicio,
      fim: horario.fim,
    });
  };

  const handleEditTurma = (turma) => {
    navigation.navigate("AddTurma", { campoId: campo.id, turma });
  };

  const handleDeleteTurma = async (id) => {
    try {
      await turmaService.deleteTurma(id);
      setTurmasDoCampo(turmasDoCampo.filter((turma) => turma.id !== id));
    } catch (error) {
      console.error("Erro ao deletar turma:", error);
      alert("Erro ao deletar a turma.");
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
        <Text style={styles.title}>{campo.nome}</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddTurma}>
          <Text style={styles.addButtonText}>+ Adicionar Turma</Text>
        </TouchableOpacity>
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

      <View style={styles.turmasContainer}>
        {turmasDoDia.length > 0 ? (
          turmasDoDia.map((turma) => {
            const emAtraso = isTurmaEmAtraso(turma.createdAt);
            return (
              <Animated.View
                key={turma.id}
                style={[
                  styles.turmaCard,
                  emAtraso && {
                    backgroundColor: "#FF0000",
                    opacity: blinkAnim,
                  },
                  turma.id === itemId && styles.turmaCardDestacada, // Destaque para o item clicado
                ]}
              >
                <Text style={[styles.turmaTime, emAtraso && styles.textWhite]}>
                  {turma.inicio} - {turma.fim}
                </Text>
                <Text style={[styles.turmaName, emAtraso && styles.textWhite]}>
                  {turma.nome}
                </Text>
                <Text
                  style={[styles.turmaDetail, emAtraso && styles.textWhite]}
                >
                  Responsável: {turma.responsavel}
                </Text>
                <Text
                  style={[styles.turmaDetail, emAtraso && styles.textWhite]}
                >
                  Telefone: {turma.telefone}
                </Text>
                <Text
                  style={[styles.turmaDetail, emAtraso && styles.textWhite]}
                >
                  Criado em: {formatarDataCriacao(turma.createdAt)}
                </Text>
                <Text
                  style={[styles.turmaDetail, emAtraso && styles.textWhite]}
                >
                  Próximo pagamento: {calcularProximoPagamento(turma.createdAt)}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditTurma(turma)}
                  >
                    <Text style={styles.actionText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTurma(turma.id)}
                  >
                    <Text style={styles.actionText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })
        ) : (
          <Text style={styles.noTurmaText}>Nenhuma turma neste dia</Text>
        )}
      </View>
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
  addButton: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
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
  turmaCardDestacada: {
    borderWidth: 2,
    borderColor: "#ffcc00", // Destaque amarelo para o item clicado
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
