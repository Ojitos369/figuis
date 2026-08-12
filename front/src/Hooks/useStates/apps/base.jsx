import { useDispatch, useSelector } from "react-redux";
import { f as ff } from "../fs";
import axios from "axios";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { API_URL } from "../../../constants/api";

const MySwal = withReactContent(Swal);
axios.defaults.withCredentials = true;
const miAxios = axios.create({
    baseURL: API_URL,
});

const pjid = "figuis";

import { app as appMod } from "./app";
import { general as generalMod } from "./general";
import { auth as authMod } from "./auth";
import { catalogo as catalogoMod } from "./catalogo";
import { admin as adminMod } from "./admin";

const updates = () => {
    const ls = useSelector(state => state.fs.ls);
    const d = useDispatch();

    const urs = () => {
        d(ff.rs());
    }
    const u0 = (f0, value) => {
        d(ff.u0({ f0, value }));
    }
    const u1 = (f0, f1, value) => {
        d(ff.u1({ f0, f1, value }));
    }
    const u2 = (f0, f1, f2, value) => {
        d(ff.u2({ f0, f1, f2, value }));
    }
    const u3 = (f0, f1, f2, f3, value) => {
        d(ff.u3({ f0, f1, f2, f3, value }));
    }
    const u4 = (f0, f1, f2, f3, f4, value) => {
        d(ff.u4({ f0, f1, f2, f3, f4, value }));
    }
    const u5 = (f0, f1, f2, f3, f4, f5, value) => {
        d(ff.u5({ f0, f1, f2, f3, f4, f5, value }));
    }
    const u6 = (f0, f1, f2, f3, f4, f5, f6, value) => {
        d(ff.u6({ f0, f1, f2, f3, f4, f5, f6, value }));
    }
    const u7 = (f0, f1, f2, f3, f4, f5, f6, f7, value) => {
        d(ff.u7({ f0, f1, f2, f3, f4, f5, f6, f7, value }));
    }
    const u8 = (f0, f1, f2, f3, f4, f5, f6, f7, f8, value) => {
        d(ff.u8({ f0, f1, f2, f3, f4, f5, f6, f7, f8, value }));
    }
    const u9 = (f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, value) => {
        d(ff.u9({ f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, value }));
    }
    const addToast = (toast) => {
        d(ff.addToast({ toast }));
    }
    const removeToast = (id) => {
        d(ff.removeToast({ id }));
    }
    return { urs, u0, u1, u2, u3, u4, u5, u6, u7, u8, u9, addToast, removeToast }
}


export const useBase = props => {
    const s = useSelector(state => state.fs.s);
    const updatesVars = updates();
    const { u0, u1, u2, u3, u4, u5, u6, u7, u8, u9 } = updatesVars;
    const bases = { miAxios, MySwal, s, pjid };

    const general = generalMod({ ...bases, ...updatesVars });
    const app = appMod({ ...bases, ...updatesVars });
    const auth = authMod({ ...bases, ...updatesVars, notificacion: general.notificacion });
    const catalogo = catalogoMod({ ...bases, ...updatesVars, notificacion: general.notificacion });
    const admin = adminMod({ ...bases, ...updatesVars, notificacion: general.notificacion });

    return {
        MySwal, miAxios,
        u0, u1, u2, u3, u4, u5, u6, u7, u8, u9,
        app, general, auth, catalogo, admin,
    };
}
