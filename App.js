// App.js
import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import HomeScreen from "./src/screens/HomeScreen";
import CampoDetailScreen from "./src/screens/CampoDetailScreen";
import AddCampoScreen from "./src/screens/AddCampoScreen";
import AddTurmaScreen from "./src/screens/AddTurmaScreen";

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

function HomeStack({ navigation, route, mode }) {
  // Mode passado diretamente como prop
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

function PlaceholderScreen({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Em Desenvolvimento</Text>
    </View>
  );
}

function CustomDrawerContent(props) {
  const { navigation, setMode, mode } = props;

  const handleAddCampo = () => {
    console.log("Drawer: Solicitando abertura do modal de adicionar campo");
    const homeParams = navigation
      .getState()
      .routes.find((r) => r.name === "HomeStack")?.state?.routes[0]?.params;
    if (homeParams?.openAddModal) {
      homeParams.openAddModal();
      navigation.closeDrawer();
    } else {
      console.error(
        "Drawer: openAddModal não encontrado nos parâmetros da Home!"
      );
      navigation.navigate("HomeStack", {
        screen: "Home",
        params: { openAddModal: true },
      });
      navigation.closeDrawer();
    }
  };

  const handleConfigHorarios = () => {
    console.log("Drawer: Solicitando abertura do modal de configurar horários");
    const homeParams = navigation
      .getState()
      .routes.find((r) => r.name === "HomeStack")?.state?.routes[0]?.params;
    if (homeParams?.openConfigModal) {
      homeParams.openConfigModal();
      navigation.closeDrawer();
    } else {
      console.error(
        "Drawer: openConfigModal não encontrado nos parâmetros da Home!"
      );
      navigation.navigate("HomeStack", {
        screen: "Home",
        params: { openConfigModal: true },
      });
      navigation.closeDrawer();
    }
  };

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItem
        label="Turmas"
        onPress={() => {
          console.log("Drawer: Clique em Turmas - Antes de setMode");
          setMode("turmas");
          console.log(
            "Drawer: Clique em Turmas - Após setMode, modo definido como turmas"
          );
          navigation.navigate("HomeStack", {
            screen: "Home",
            params: { mode: "turmas" },
          });
          console.log("Drawer: Clique em Turmas - Após navigate");
          navigation.closeDrawer();
          console.log("Drawer: Clique em Turmas - Drawer fechado");
        }}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
      <DrawerItem
        label="Escolinha"
        onPress={() => {
          console.log("Drawer: Clique em Escolinha - Antes de setMode");
          setMode("escolinha");
          console.log(
            "Drawer: Clique em Escolinha - Após setMode, modo definido como escolinha"
          );
          navigation.navigate("HomeStack", {
            screen: "Home",
            params: { mode: "escolinha" },
          });
          console.log("Drawer: Clique em Escolinha - Após navigate");
          navigation.closeDrawer();
          console.log("Drawer: Clique em Escolinha - Drawer fechado");
        }}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
      <DrawerItem
        label="Adicionar Campo"
        onPress={handleAddCampo}
        labelStyle={{ color: "#fff", fontSize: 18 }}
      />
      <DrawerItem
        label="Registrar Pagamento"
        onPress={() => navigation.navigate("RegistrarPagamento")}
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
        <Drawer.Screen
          name="RegistrarPagamento"
          component={PlaceholderScreen}
        />
        <Drawer.Screen name="Relatorios" component={PlaceholderScreen} />
        <Drawer.Screen
          name="ConfigurarHorarios"
          component={PlaceholderScreen}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
