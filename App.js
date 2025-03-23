import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { View, Text } from "react-native";
import HomeScreen from "./src/screens/HomeScreen";
import CampoDetailScreen from "./src/screens/CampoDetailScreen";
import AddCampoScreen from "./src/screens/AddCampoScreen";
import AddTurmaScreen from "./src/screens/AddTurmaScreen";
import AlunosScreen from "./src/screens/AlunosScreen";
import PriceTableScreen from "./src/screens/PriceTableScreen";
import PaymentReportScreen from "./src/screens/PaymentReportScreen";
import ReportsScreen from "./src/screens/ReportsScreen";
import CalendarioScreen from "./src/screens/CalendarioScreen";

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

function HomeStack({ navigation, route, mode }) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" options={{ headerShown: false }}>
        {(props) => <HomeScreen {...props} mode={mode} />}
      </Stack.Screen>
      <Stack.Screen name="CampoDetail" options={{ title: "Detalhes do Campo" }}>
        {(props) => <CampoDetailScreen {...props} mode={mode} />}
      </Stack.Screen>
      <Stack.Screen
        name="AddCampo"
        component={AddCampoScreen}
        options={{ title: "Adicionar Campo" }}
      />
      <Stack.Screen
        name="AddTurma"
        options={{
          title: mode === "turmas" ? "Adicionar Turma" : "Adicionar Aula",
        }}
      >
        {(props) => <AddTurmaScreen {...props} mode={mode} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function CustomDrawerContent(props) {
  const { navigation, setMode, mode } = props;

  const handleAddCampo = () => {
    console.log("Drawer: Navegando para Home com modal de adicionar campo");
    navigation.navigate("HomeStack", {
      screen: "Home",
      params: { openAddModal: true, mode },
    });
    navigation.closeDrawer();
  };

  const handleConfigHorarios = () => {
    console.log("Drawer: Navegando para Home com modal de configurar horários");
    navigation.navigate("HomeStack", {
      screen: "Home",
      params: { openConfig: true, mode }, // Usando openConfig em vez de openConfigModal
    });
    navigation.closeDrawer();
  };

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItem
        label="Turmas"
        onPress={() => {
          setMode("turmas");
          navigation.navigate("HomeStack", {
            screen: "Home",
            params: { mode: "turmas" },
          });
          navigation.closeDrawer();
        }}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
      <DrawerItem
        label="Escolinha"
        onPress={() => {
          setMode("escolinha");
          navigation.navigate("HomeStack", {
            screen: "Home",
            params: { mode: "escolinha" },
          });
          navigation.closeDrawer();
        }}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
      <DrawerItem
        label="Adicionar Campo"
        onPress={handleAddCampo}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
      <DrawerItem
        label="Alunos"
        onPress={() => navigation.navigate("Alunos")}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
      <DrawerItem
        label="Registrar Pagamento"
        onPress={() => navigation.navigate("PaymentReport")}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
      <DrawerItem
        label="Relatórios"
        onPress={() => navigation.navigate("Relatorios")}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
      <DrawerItem
        label="Configurar Horários"
        onPress={handleConfigHorarios}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
      <DrawerItem
        label="Tabela de Preços"
        onPress={() => {
          navigation.navigate("PriceTable");
          navigation.closeDrawer();
        }}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
      <DrawerItem
        label="Calendário"
        onPress={() => {
          navigation.navigate("Calendario");
          navigation.closeDrawer();
        }}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
    </DrawerContentScrollView>
  );
}

export default function App() {
  const [mode, setMode] = useState("turmas"); // Estado inicial: Turmas

  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="HomeStack"
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: "#04394e",
          },
        }}
        drawerContent={(props) => (
          <CustomDrawerContent {...props} setMode={setMode} mode={mode} />
        )}
      >
        <Drawer.Screen name="HomeStack">
          {(props) => <HomeStack {...props} mode={mode} />}
        </Drawer.Screen>
        <Drawer.Screen name="PaymentReport" component={PaymentReportScreen} />
        <Drawer.Screen name="Relatorios" component={ReportsScreen} />
        <Drawer.Screen name="Alunos" component={AlunosScreen} />
        <Drawer.Screen name="PriceTable" component={PriceTableScreen} />
        <Drawer.Screen name="Calendario" component={CalendarioScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
