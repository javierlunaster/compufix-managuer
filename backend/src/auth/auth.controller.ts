import { Body, Controller, Patch, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthenticatedUser } from "./decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  // Límite propio, más estricto que el general de la API (100/min): 5
  // intentos de login por minuto por IP. El mensaje de error de login ya
  // es genérico a propósito (no revela si el usuario existe); este límite
  // es la segunda capa — sin él, alguien podría probar miles de
  // contraseñas por minuto contra un mismo usuario.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Requiere estar autenticado (no es @Public()): cualquier usuario puede
  // cambiar SU PROPIA contraseña.
  @Patch("change-password")
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }
}
